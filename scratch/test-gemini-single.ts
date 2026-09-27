import dotenv from "dotenv";
dotenv.config();

import { GeminiProvider } from "../lib/ai/gemini";
import { parseAndValidateAIResponse } from "../lib/ai-parser";

async function main() {
  process.env.AI_PROVIDER = "gemini";
  const provider = new GeminiProvider();

  console.log("Testing Gemini provider...");
  try {
    const result = await provider.generateApplication({
      messages: [{ role: "user", content: "Build a simple counter application with a modern UI." }],
      fileData: null,
    });
    console.log("[OK] Gemini raw output length:", result.rawText.length);
    const parsed = parseAndValidateAIResponse(result.rawText);
    console.log("[SUCCESS] Gemini schema validation PASSED! Title:", parsed.title);
    console.log("Files generated:", Object.keys(parsed.files));
  } catch (err: any) {
    console.error("[GEMINI RESULT]", err.message || err);
  }
}

main();
