// lib/ai/openrouter.ts
import {
  AIProvider,
  AIInput,
  AIProviderResult,
  AIProviderError,
  SYSTEM_PROMPT,
  trimHistory,
} from "./types";
import type { Message, FileData } from "@/types/workspace";

function buildOpenAIMessages(messages: Message[], fileData: FileData | null) {
  const trimmed = trimHistory(messages);

  const formattedMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  trimmed.forEach((msg, idx) => {
    const role = msg.role === "assistant" ? "assistant" : "user";
    let text = msg.content;

    if (msg.role === "user") {
      if (msg.imageUrl) {
        text = `[The user has attached an image. Use this URL directly in the generated app where relevant: ${msg.imageUrl}]\n\n${text}`;
      }

      const isLast = idx === trimmed.length - 1;
      if (isLast && fileData) {
        text +=
          "\n\nCurrent project files for context:\n" +
          JSON.stringify(fileData, null, 2);
      }
    }

    formattedMessages.push({ role, content: text });
  });

  return formattedMessages;
}

export class OpenRouterProvider implements AIProvider {
  name = "openrouter" as const;
  private apiKey: string;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new AIProviderError(
        "openrouter",
        "OPENROUTER_API_KEY is not configured.",
        401,
        false
      );
    }
    this.apiKey = apiKey;
    this.model = process.env.OPENROUTER_MODEL || "cohere/north-mini-code:free";
  }

  async generateApplication(input: AIInput): Promise<AIProviderResult> {
    const openAiMessages = buildOpenAIMessages(input.messages, input.fileData);
    let attempt = 0;
    const maxRetries = 2;

    while (attempt < maxRetries) {
      attempt++;
      try {
        console.log(
          `[AI] Provider: openrouter | Model: ${this.model} | Attempt: ${attempt}/${maxRetries}`
        );
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://nexora.app",
            "X-Title": "Nexora AI App Builder",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: openAiMessages,
            temperature: 0.7,
            max_tokens: 4096,
          }),
        });

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message?: string; code?: string | number };
        };

        if (!res.ok) {
          const status = res.status;
          const errMsg = data?.error?.message || `OpenRouter API returned status ${status}`;

          console.warn(
            `[AI] Provider: openrouter | Status: ${status} | Error: ${errMsg}`
          );

          if (status === 429) {
            throw new AIProviderError(
              "openrouter",
              "AI provider quota reached. Please try again later or switch AI provider.",
              429,
              false
            );
          }

          if (status === 401 || status === 403) {
            throw new AIProviderError(
              "openrouter",
              "OpenRouter API authentication error. Please verify OPENROUTER_API_KEY.",
              status,
              false
            );
          }

          if (status === 404) {
            throw new AIProviderError(
              "openrouter",
              `OpenRouter model "${this.model}" is unavailable or requires payment. Please check OPENROUTER_MODEL in .env.`,
              404,
              false
            );
          }

          if (status >= 500 && status <= 504 && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1500;
            console.log(`[AI] Provider: openrouter | Transient ${status} error: backing off ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          throw new AIProviderError("openrouter", errMsg, status, false);
        }

        const rawText = data.choices?.[0]?.message?.content || "";
        console.log(`[AI] Provider: openrouter | Generation completed. Length: ${rawText.length}`);
        return { rawText };
      } catch (err: unknown) {
        if (err instanceof AIProviderError) throw err;
        const errMsg = err instanceof Error ? err.message : String(err);
        throw new AIProviderError("openrouter", errMsg, 500, false);
      }
    }

    throw new AIProviderError(
      "openrouter",
      "OpenRouter service is currently unavailable. Please try again later.",
      503,
      false
    );
  }
}
