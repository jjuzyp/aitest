"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ChatStreamEvent } from "../lib/types";

type ChatRole = "user" | "assistant" | "system";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  ttftMs?: number;
  totalMs?: number;
};

function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: `${role}-${crypto.randomUUID()}`,
    role,
    content,
  };
}

function parseSseFrame(rawFrame: string): ChatStreamEvent | "[DONE]" | null {
  const dataLines = rawFrame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());

  if (!dataLines.length) {
    return null;
  }

  const payload = dataLines.join("\n");
  if (payload === "[DONE]") {
    return "[DONE]";
  }

  return JSON.parse(payload) as ChatStreamEvent;
}

export function ChatShell() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [value, setValue] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [pending, setPending] = useState(false);
  const [pendingSince, setPendingSince] = useState<number | null>(null);
  const [activeAssistantId, setActiveAssistantId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [fatalError, setFatalError] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setBootstrapping(true);
        setFatalError(null);
        setMessages([]);
        const response = await fetch("/api/session", {
          method: "POST",
        });
        const payload = (await response.json()) as {
          sessionId?: string;
          error?: string;
        };

        if (!response.ok || !payload.sessionId) {
          throw new Error(payload.error || "Failed to create session");
        }

        if (!cancelled) {
          setSessionId(payload.sessionId);
        }
      } catch (error) {
        if (!cancelled) {
          setFatalError(
            error instanceof Error ? error.message : "Failed to create session",
          );
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void bootstrap();

    function tearDownSession() {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) {
        return;
      }

      void fetch("/api/session", {
        method: "DELETE",
        keepalive: true,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
        }),
      }).catch(() => {
        // Ignore best-effort cleanup failures on unload.
      });
    }

    window.addEventListener("pagehide", tearDownSession);

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", tearDownSession);
      tearDownSession();
    };
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [messages, pending]);

  useEffect(() => {
    if (!pending || pendingSince === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [pending, pendingSince]);

  const disabled = useMemo(
    () => pending || bootstrapping || !sessionId || Boolean(fatalError),
    [pending, bootstrapping, sessionId, fatalError],
  );

  const liveElapsedMs =
    pending && pendingSince !== null ? Math.max(0, nowMs - pendingSince) : null;

  async function submitMessage() {
    const text = value.trim();
    if (!text || !sessionId || pending) {
      return;
    }

    const assistantId = `assistant-${crypto.randomUUID()}`;
    setValue("");
    setPending(true);
    setPendingSince(Date.now());
    setActiveAssistantId(assistantId);
    setMessages((current) => [
      ...current,
      createMessage("user", text),
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message: text,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as {
          error?: string;
        };
        throw new Error(payload.error || "Request failed");
      }

      if (!response.body) {
        throw new Error("Stream body is missing");
      }

      const decoder = new TextDecoder();
      const reader = response.body.getReader();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() || "";

        for (const frame of frames) {
          const payload = parseSseFrame(frame);
          if (!payload || payload === "[DONE]") {
            continue;
          }

          if (payload.type === "delta") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: `${message.content}${payload.text}` }
                  : message,
              ),
            );
          } else if (payload.type === "first-token") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, ttftMs: payload.elapsedMs }
                  : message,
              ),
            );
          } else if (payload.type === "done") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      content: payload.fullText || message.content,
                      totalMs: payload.elapsedMs,
                    }
                  : message,
              ),
            );
          } else if (payload.type === "error") {
            throw new Error(payload.message || "Stream failed");
          }
        }
      }
    } catch (error) {
      setMessages((current) => [
        ...current.filter((message) => message.id !== assistantId),
        createMessage(
          "system",
          error instanceof Error ? error.message : "Request failed",
        ),
      ]);
    } finally {
      setPending(false);
      setPendingSince(null);
      setActiveAssistantId(null);
    }
  }

  return (
    <main className="shell">
      <div ref={viewportRef} className="messages" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} className={`message message-${message.role}`}>
            <div>
              {message.role === "assistant" &&
              message.id === activeAssistantId &&
              pending &&
              !message.content ? (
                <div className="thinking-row" aria-live="polite">
                  <div className="thinking-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  {liveElapsedMs !== null ? (
                    <span className="message-timing">
                      Thinking {(liveElapsedMs / 1000).toFixed(1)} s
                    </span>
                  ) : null}
                </div>
              ) : message.role === "assistant" ? (
                <div className="message-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content || " "}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="message-content">{message.content}</div>
              )}
              {message.role === "assistant" &&
              ((message.id === activeAssistantId &&
                pending &&
                liveElapsedMs !== null &&
                message.content) ||
                message.ttftMs ||
                message.totalMs) ? (
                <div className="message-meta">
                  {message.id === activeAssistantId &&
                  pending &&
                  liveElapsedMs !== null &&
                  message.content ? (
                    <span className="message-timing">
                      Thinking {(liveElapsedMs / 1000).toFixed(1)} s
                    </span>
                  ) : null}
                  {message.ttftMs ? (
                    <span className="message-timing">
                      TTFT {message.ttftMs} ms
                    </span>
                  ) : null}
                  {message.totalMs ? (
                    <span className="message-timing">
                      Total {message.totalMs} ms
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        ))}
        {fatalError ? (
          <article className="message message-system">
            <div className="message-content">{fatalError}</div>
          </article>
        ) : null}
      </div>
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void submitMessage();
        }}
      >
        <textarea
          id="chat-input"
          name="message"
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submitMessage();
            }
          }}
        />
      </form>
    </main>
  );
}
