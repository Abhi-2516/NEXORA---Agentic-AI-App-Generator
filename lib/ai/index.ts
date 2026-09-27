import { AIProvider, AIProviderError } from "./types";
import { GeminiProvider } from "./gemini";
import { GroqProvider } from "./groq";
import { OpenRouterProvider } from "./openrouter";

export * from "./types";
export * from "./gemini";
export * from "./groq";
export * from "./openrouter";

export function getAIProvider(): AIProvider {
  const providerName = (process.env.AI_PROVIDER || "gemini").toLowerCase().trim();

  switch (providerName) {
    case "gemini":
      return new GeminiProvider();
    case "groq":
      return new GroqProvider();
    case "openrouter":
      return new OpenRouterProvider();
    default:
      throw new AIProviderError(
        providerName,
        `Unsupported AI_PROVIDER "${process.env.AI_PROVIDER}". Supported providers are: gemini, groq, openrouter.`,
        400,
        false
      );
  }
}
