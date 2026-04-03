import type { AppConfig } from "./config.ts";
import type { ModelMessage } from "./types.ts";

export type OpenRouterChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
    };
    finish_reason?: string | null;
  }>;
  error?: {
    message?: string | null;
  };
};

export type OpenRouterClient = {
  chat: {
    send: (
      params: {
        httpReferer?: string;
        appTitle?: string;
        appCategories?: string;
        chatRequest: {
          model: string;
          messages: ModelMessage[];
          stream: true;
          streamOptions?: {
            includeUsage?: boolean;
          };
        };
      },
      options?: { signal?: AbortSignal },
    ) => Promise<AsyncIterable<OpenRouterChunk>>;
  };
};

export function getChunkText(chunk: OpenRouterChunk): string {
  const content = chunk.choices?.[0]?.delta?.content;
  return typeof content === "string" ? content : "";
}

export function getChunkErrorMessage(chunk: OpenRouterChunk): string | null {
  const message = chunk.error?.message;
  return typeof message === "string" && message ? message : null;
}

export async function createOpenRouterClient(
  config: AppConfig,
): Promise<OpenRouterClient> {
  const sdkModule = await import("@openrouter/sdk");
  const OpenRouter = sdkModule.OpenRouter as unknown as new (options: {
    apiKey: string;
  }) => OpenRouterClient;

  return new OpenRouter({
    apiKey: config.OPENROUTER_API_KEY,
  });
}

export async function createChatCompletionStream({
  client,
  config,
  model,
  messages,
  signal,
}: {
  client: OpenRouterClient;
  config: AppConfig;
  model: string;
  messages: ModelMessage[];
  signal?: AbortSignal;
}) {
  return client.chat.send(
    {
      httpReferer: config.OPENROUTER_SITE_URL,
      appTitle: config.OPENROUTER_SITE_NAME,
      appCategories: "general-chat",
      chatRequest: {
        model,
        messages,
        stream: true,
        streamOptions: {
          includeUsage: true,
        },
      },
    },
    { signal },
  );
}
