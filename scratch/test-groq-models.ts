import dotenv from "dotenv";
dotenv.config();

import { parseAndValidateAIResponse } from "../lib/ai-parser";

async function testGroqModel(model: string) {
  console.log(`\nTesting Groq model: ${model}...`);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `You are an expert React developer. Your job is to generate complete, working React applications based on user prompts.

RULES:
1. Always respond with a valid JSON object — no markdown fences, no extra text.
2. The JSON must match this exact shape:
{
  "assistantMessage": "<brief explanation of what you built/changed>",
  "title": "<short 2-4 word title for the app, e.g. 'Todo List App'>",
  "files": {
    "/App.js": { "code": "<full file content>" }
  },
  "dependencies": {}
}
3. Use React (functional components + hooks).
4. The entry point must always be /App.js and must export a default component.`,
          },
          { role: "user", content: "Build a counter application with increment, decrement and reset buttons." }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    const data = await res.json() as any;
    if (!res.ok) {
      console.error(`[FAIL] ${model} HTTP ${res.status}:`, data?.error?.message || data);
      return false;
    }

    const content = data.choices?.[0]?.message?.content || "";
    console.log(`[OK] ${model} generated ${content.length} chars.`);

    const parsed = parseAndValidateAIResponse(content);
    console.log(`[SUCCESS] ${model} schema validation PASSED! Title: "${parsed.title}"`);
    return true;
  } catch (err: any) {
    console.error(`[FAIL] ${model} error:`, err.message || err);
    return false;
  }
}

async function main() {
  const models = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "allam-2-7b",
  ];

  for (const m of models) {
    await testGroqModel(m);
  }
}

main();
