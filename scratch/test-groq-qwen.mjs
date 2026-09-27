import dotenv from "dotenv";
dotenv.config();

import { GroqProvider } from "../lib/ai/groq";
import { parseAndValidateAIResponse } from "../lib/ai-parser";

async function main() {
  process.env.GROQ_MODEL = "qwen/qwen3.8-27b";
  const provider = new GroqProvider();

  console.log("Testing Groq with qwen/qwen3.8-27b...");
  try {
    const result = await provider.generateApplication({
      messages: [{ role: "user", content: "Build a modern todo application with dark mode, categories, filtering, completed state and animations." }],
      fileData: null
    });
    console.log("Result raw length:", result.rawText.length);
    const parsed = parseAndValidateAIResponse(result.rawText);
    console.log("GROQ SUCCESS! App title:", parsed.title);
    console.log("Files:", Object.keys(parsed.files));
  } catch (err) {
    console.error("GROQ ERROR:", err);
  }
}

main();
