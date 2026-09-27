import dotenv from "dotenv";
dotenv.config();

import { getAIProvider } from "../lib/ai";
import { parseAndValidateAIResponse } from "../lib/ai-parser";

async function testProvider(providerName: string, prompt: string) {
  console.log(`\n==================================================`);
  console.log(`TESTING PROVIDER: ${providerName}`);
  console.log(`PROMPT: "${prompt}"`);
  console.log(`==================================================`);

  process.env.AI_PROVIDER = providerName;
  const provider = getAIProvider();

  const startTime = Date.now();
  try {
    const result = await provider.generateApplication({
      messages: [{ role: "user", content: prompt }],
      fileData: null,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[OK] Raw response received in ${elapsed}s. Size: ${result.rawText.length} bytes.`);

    const parsed = parseAndValidateAIResponse(result.rawText);
    console.log(`[OK] Schema validation PASSED!`);
    console.log(`Title: "${parsed.title}"`);
    console.log(`Assistant message: "${parsed.assistantMessage}"`);
    console.log(`Files generated (${Object.keys(parsed.files).length}):`, Object.keys(parsed.files));
    console.log(`Dependencies:`, parsed.dependencies);
    if (!parsed.files["/App.js"]) {
      throw new Error("Missing /App.js entry point!");
    }
    console.log(`[SUCCESS] ${providerName} generated a fully valid NEXORA app!`);
    return true;
  } catch (err: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[FAIL] ${providerName} failed after ${elapsed}s:`, err.message || err);
    return false;
  }
}

async function main() {
  console.log("Starting NEXORA Multi-Provider E2E Tests...\n");

  const results: Record<string, boolean> = {};

  // Test Groq
  results["groq"] = await testProvider(
    "groq",
    "Build a modern todo application with dark mode, categories, filtering, completed state and animations."
  );

  // Test OpenRouter
  results["openrouter"] = await testProvider(
    "openrouter",
    "Build a modern recipe finder with search, category filters, recipe cards and responsive design."
  );

  // Test Gemini
  results["gemini"] = await testProvider(
    "gemini",
    "Build a simple counter application with a modern UI."
  );

  console.log("\n==================================================");
  console.log("SUMMARY OF E2E PROVIDER TESTS:");
  console.log("==================================================");
  for (const [prov, passed] of Object.entries(results)) {
    console.log(`${prov.toUpperCase()}: ${passed ? "PASSED ✅" : "FAILED ❌"}`);
  }
}

main();
