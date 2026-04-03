import crypto from "node:crypto";
import fs from "node:fs/promises";

import { buildModelMessages } from "../../../lib/dashboard-context";
import { readConfig } from "../../../lib/config";
import {
  createChatCompletionStream,
  createOpenRouterClient,
  getChunkErrorMessage,
  getChunkText,
} from "../../../lib/openrouter-client";
import { createSessionStore } from "../../../lib/session-store";

export const runtime = "nodejs";

async function loadDashboardHtml(config: ReturnType<typeof readConfig>) {
  return fs.readFile(config.DASHBOARD_HTML_PATH, "utf8");
}

const SYSTEM_PROMPT = `You are Qwen3.6 Plus, a large language model from qwen.

Formatting Rules:
- Use Markdown for lists, tables, and styling.
- Use \`\`\`code fences\`\`\` for all code blocks.
- Format file names, paths, and function names with \`inline code\` backticks.
- For all mathematical expressions, use $...$ for inline math and $$...$$ for block math.
- For long answers with secondary detail, use collapsible <details>/<summary> sections when helpful.
- Always answer in Russian.
- You are a marketplace analyst, not a software developer. Do not write code unless the user explicitly asks for it.`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: unknown;
      message?: unknown;
    };
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!sessionId) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    if (!message) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    const config = readConfig();
    const store = createSessionStore(config.SESSIONS_DIR);
    const session = await store.getSession(sessionId);

    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const dashboardHtml = session.htmlInjected
      ? ""
      : await loadDashboardHtml(config);
    const nextModelContext = buildModelMessages({
      systemPrompt: SYSTEM_PROMPT,
      dashboardHtml,
      history: session.modelMessages,
      userMessage: message,
      htmlInjected: session.htmlInjected,
    });

    const client = await createOpenRouterClient(config);
    const upstream = await createChatCompletionStream({
      client,
      config,
      model: config.OPENROUTER_MODEL,
      messages: nextModelContext.messages,
      signal: request.signal,
    });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const startedAt = Date.now();
        const userCreatedAt = new Date().toISOString();
        let firstTokenElapsedMs: number | null = null;
        let fullText = "";

        const send = (payload: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        };

        send({
          type: "meta",
          startedAt,
          sessionId,
        });

        try {
          for await (const chunk of upstream) {
            const errorMessage = getChunkErrorMessage(chunk);
            if (errorMessage) {
              throw new Error(errorMessage);
            }

            const text = getChunkText(chunk);
            if (!text) {
              continue;
            }

            if (firstTokenElapsedMs === null) {
              firstTokenElapsedMs = Date.now() - startedAt;
              send({
                type: "first-token",
                elapsedMs: firstTokenElapsedMs,
              });
            }

            fullText += text;
            send({
              type: "delta",
              text,
            });
          }

          const finishedAt = new Date().toISOString();
          await store.saveSession({
            ...session,
            updatedAt: finishedAt,
            htmlInjected: nextModelContext.htmlInjected,
            uiMessages: [
              ...session.uiMessages,
              {
                id: `user-${crypto.randomUUID()}`,
                role: "user",
                content: message,
                createdAt: userCreatedAt,
              },
              {
                id: `assistant-${crypto.randomUUID()}`,
                role: "assistant",
                content: fullText,
                createdAt: finishedAt,
              },
            ],
            modelMessages: [
              ...nextModelContext.messages,
              {
                role: "assistant",
                content: fullText,
              },
            ],
          });

          send({
            type: "done",
            elapsedMs: Date.now() - startedAt,
            fullText,
          });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          send({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to stream chat message",
          });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send chat message",
      },
      { status: 500 },
    );
  }
}
