import type { ModelMessage } from "./types.ts";

export type BuildModelMessagesParams = {
  systemPrompt: string;
  dashboardHtml: string;
  history: ModelMessage[];
  userMessage: string;
  htmlInjected: boolean;
};

export type BuildModelMessagesResult = {
  messages: ModelMessage[];
  htmlInjected: boolean;
};

function buildInjectionUserMessage(dashboardHtml: string, userMessage: string) {
  return [
    "The current dashboard HTML is attached below.",
    "Use it as the primary source of truth for this session.",
    "",
    "=== DASHBOARD HTML ===",
    dashboardHtml,
    "",
    userMessage,
  ].join("\n");
}

export function buildModelMessages({
  systemPrompt,
  dashboardHtml,
  history,
  userMessage,
  htmlInjected,
}: BuildModelMessagesParams): BuildModelMessagesResult {
  const messages = [...history];

  if (!messages.some((message) => message.role === "system")) {
    messages.unshift({ role: "system", content: systemPrompt });
  }

  const shouldInjectHtml = !htmlInjected;
  messages.push({
    role: "user",
    content: shouldInjectHtml
      ? buildInjectionUserMessage(dashboardHtml, userMessage)
      : userMessage,
  });

  return {
    messages,
    htmlInjected: htmlInjected || shouldInjectHtml,
  };
}
