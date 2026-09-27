import dotenv from "dotenv";
dotenv.config();

import { GroqProvider } from "../lib/ai/groq";

async function main() {
  process.env.GROQ_MODEL = "qwen/qwen3.8-27b";
  const provider = new GroqProvider();
  const res = await provider.generateApplication({
    messages: [{ role: "user", content: "Build a modern todo application with dark mode, categories, filtering, completed state and animations." }],
    fileData: null
  });
  console.log("--- RAW RESPONSE START ---");
  console.log(res.rawText);
  console.log("--- RAW RESPONSE END ---");
}

main();
