// lib/ai/gemini.ts
import { GoogleGenAI } from "@google/genai";
import {
  AIProvider,
  AIInput,
  AIProviderResult,
  AIProviderError,
  SYSTEM_PROMPT,
  trimHistory,
} from "./types";
import type { Message, FileData } from "@/types/workspace";

function buildGeminiContents(messages: Message[], fileData: FileData | null) {
  const trimmed = trimHistory(messages);

  return trimmed.map((msg, idx) => {
    const role = msg.role === "assistant" ? "model" : "user";

    if (msg.role === "user") {
      let text = msg.content;

      if (msg.imageUrl) {
        text = `[The user has attached an image. Use this URL directly in the generated app where relevant (as img src, background-image, etc.): ${msg.imageUrl}]\n\n${text}`;
      }

      const isLast = idx === trimmed.length - 1;
      if (isLast && fileData) {
        text +=
          "\n\nCurrent project files for context:\n" +
          JSON.stringify(fileData, null, 2);
      }

      return { role, parts: [{ text }] };
    }

    return { role, parts: [{ text: msg.content }] };
  });
}

function parseGeminiErrorDetails(err: unknown) {
  const status = (err as { status?: number })?.status ?? 500;
  const errMsg = err instanceof Error ? err.message : String(err);

  const is429 =
    status === 429 ||
    errMsg.includes("429") ||
    errMsg.includes("RESOURCE_EXHAUSTED");
  const is503 =
    status === 503 ||
    status === 502 ||
    errMsg.includes("503") ||
    errMsg.includes("UNAVAILABLE");
  const isDailyQuota =
    errMsg.includes("GenerateRequestsPerDay") ||
    (errMsg.includes("limit: 20") && is429);

  let retryDelaySeconds: number | null = null;
  const match =
    errMsg.match(/retry\s+in\s+([\d.]+)\s*s/i) ||
    errMsg.match(/retryDelay["']?\s*:\s*["']?([\d.]+)\s*s?["']?/i);
  if (match && match[1]) {
    const parsedSec = parseFloat(match[1]);
    if (!isNaN(parsedSec) && parsedSec > 0) {
      retryDelaySeconds = Math.ceil(parsedSec);
    }
  }

  let userFacingMessage = "Gemini generation failed. Please try again.";
  if (is429) {
    if (retryDelaySeconds) {
      userFacingMessage = `Gemini API quota reached. Please wait ${retryDelaySeconds} seconds before trying again.`;
    } else {
      userFacingMessage =
        "Gemini API quota reached. Please try again later or switch AI provider.";
    }
  } else if (is503) {
    userFacingMessage =
      "Gemini model is currently experiencing high demand. Please try again in a moment.";
  }

  return {
    status: is429 ? 429 : is503 ? 503 : status,
    is429,
    is503,
    isDailyQuota,
    retryDelaySeconds,
    userFacingMessage,
  };
}

export class GeminiProvider implements AIProvider {
  name = "gemini" as const;
  private client: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AIProviderError(
        "gemini",
        "GEMINI_API_KEY is not configured.",
        401,
        false
      );
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateApplication(input: AIInput): Promise<AIProviderResult> {
    const contents = buildGeminiContents(input.messages, input.fileData);
    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      attempt++;
      try {
        console.log(
          `[AI] Provider: gemini | Model: gemini-3.5-flash | Attempt: ${attempt}/${maxRetries}`
        );
        const response = await this.client.models.generateContent({
          model: "gemini-3.5-flash",
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        });

        console.log(`[AI] Provider: gemini | Generation completed`);
        return { rawText: response.text || "" };
      } catch (err: unknown) {
        const parsed = parseGeminiErrorDetails(err);

        console.warn(
          `[AI] Provider: gemini | Status: ${parsed.status} | Error: ${parsed.userFacingMessage}`
        );

        if (parsed.isDailyQuota) {
          throw new AIProviderError(
            "gemini",
            parsed.userFacingMessage,
            429,
            false
          );
        }

        if (parsed.is429) {
          if (
            attempt === 1 &&
            parsed.retryDelaySeconds &&
            parsed.retryDelaySeconds <= 10
          ) {
            const waitMs = parsed.retryDelaySeconds * 1000;
            console.log(
              `[AI] Provider: gemini | Respecting retryDelay: waiting ${waitMs}ms...`
            );
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          } else {
            throw new AIProviderError(
              "gemini",
              parsed.userFacingMessage,
              429,
              false
            );
          }
        }

        if (parsed.is503 && attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1500;
          console.log(
            `[AI] Provider: gemini | Transient 503 error: backing off ${backoffMs}ms...`
          );
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        throw new AIProviderError(
          "gemini",
          parsed.userFacingMessage,
          parsed.status,
          false
        );
      }
    }

    throw new AIProviderError(
      "gemini",
      "Gemini API quota reached. Please try again later or switch AI provider.",
      429,
      false
    );
  }
}
