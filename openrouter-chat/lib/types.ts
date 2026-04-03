export type ChatUiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  htmlInjected: boolean;
  uiMessages: ChatUiMessage[];
  modelMessages: ModelMessage[];
};

export type ChatStreamEvent =
  | { type: "meta"; startedAt: number; sessionId: string }
  | { type: "delta"; text: string }
  | { type: "first-token"; elapsedMs: number }
  | { type: "done"; elapsedMs: number; fullText: string }
  | { type: "error"; message: string };
