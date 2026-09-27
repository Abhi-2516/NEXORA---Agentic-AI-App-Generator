import dotenv from "dotenv";
dotenv.config();

import { OpenRouterProvider } from "../lib/ai/openrouter";
import { parseAndValidateAIResponse } from "../lib/ai-parser";

async function testOpenRouterModel(model: string) {
  console.log(`\nTesting OpenRouter model: ${model}...`);
  process.env.OPENROUTER_MODEL = model;
  try {
    const provider = new OpenRouterProvider();
    const result = await provider.generateApplication({
      messages: [{ role: "user", content: "Build a modern recipe finder with search, category filters, recipe cards and responsive design." }],
      fileData: null,
    });

    console.log(`[OK] ${model} generated ${result.rawText.length} bytes.`);
    const parsed = parseAndValidateAIResponse(result.rawText);
    console.log(`[SUCCESS] ${model} schema validation PASSED! Title: "${parsed.title}"`);
    console.log(`Files:`, Object.keys(parsed.files));
    return true;
  } catch (err: any) {
    console.error(`[FAIL] ${model} error:`, err.message || err);
    return false;
  }
}

async function main() {
  const models = [
    "cohere/north-mini-code:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3.5-lightning:free",
  ];

  for (const m of models) {
    const success = await testOpenRouterModel(m);
    if (success) break;
  }
}

main();
