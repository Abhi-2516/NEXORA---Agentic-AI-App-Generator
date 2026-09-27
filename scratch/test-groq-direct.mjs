import dotenv from "dotenv";
dotenv.config();

async function testGroqDirect(model: string, useResponseFormat: boolean) {
  console.log(`\nTesting model: ${model} (useResponseFormat: ${useResponseFormat})`);
  const body: any = {
    model,
    messages: [
      { role: "system", content: "You are an expert React developer. Output raw JSON with assistantMessage, title, files, and dependencies." },
      { role: "user", content: "Build a counter app." }
    ],
    temperature: 0.7,
  };
  if (useResponseFormat) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response (first 300 chars):", text.slice(0, 300));
}

async function main() {
  await testGroqDirect("qwen/qwen3.8-27b", false);
  await testGroqDirect("openai/gpt-oss-120b", false);
  await testGroqDirect("allam-2-7b", false);
}

main();
