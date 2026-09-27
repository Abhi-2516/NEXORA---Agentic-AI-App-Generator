// lib/ai/types.ts
import type { Message, FileData } from "@/types/workspace";

export type AIProviderName = "gemini" | "groq" | "openrouter";

export interface AIInput {
  messages: Message[];
  fileData: FileData | null;
}

export interface AIProviderResult {
  rawText: string;
}

export class AIProviderError extends Error {
  provider: string;
  status: number;
  retryable: boolean;

  constructor(
    provider: string,
    message: string,
    status = 500,
    retryable = false
  ) {
    super(message);
    this.name = "AIProviderError";
    this.provider = provider;
    this.status = status;
    this.retryable = retryable;
  }
}

export interface AIProvider {
  name: AIProviderName;
  generateApplication(input: AIInput): Promise<AIProviderResult>;
}

export const SYSTEM_PROMPT = `You are an expert React developer. Your job is to generate complete, working React applications based on user prompts.

RULES:
1. Always respond with a valid JSON object — no markdown fences, no extra text.
2. The JSON must match this exact shape:
{
  "assistantMessage": "<brief explanation of what you built/changed>",
  "title": "<short 2-4 word title for the app, e.g. 'Todo List App'>",
  "files": {
    "/App.js": { "code": "<full file content>" },
    "/components/SomeComponent.js": { "code": "<full file content>" }
  },
  "dependencies": {
    "some-package": "latest"
  }
}
3. Use React (functional components + hooks). Do NOT use TypeScript in generated files.
4. Use Tailwind CSS for all styling. Do not use CSS modules or inline styles unless absolutely necessary.
5. The entry point must always be /App.js and must export a default component.
6. All imports must reference files you include in "files" or packages in "dependencies".
7. Do not include react, react-dom, or tailwindcss in "dependencies" — they are always available.
8. When modifying existing code, include ALL files (both changed and unchanged) in "files".
9. Structure your code efficiently into 1 to 4 clean files. Keep mock data arrays concise (3-5 items max per list) to keep code modern, clean, and complete.
10. If the user attaches an image, use it as a design reference and match the layout/style as closely as possible.`;

export function trimHistory(messages: Message[]): Message[] {
  if (messages.length <= 10) return messages;
  return [messages[0], ...messages.slice(-8)];
}
