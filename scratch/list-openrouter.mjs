import dotenv from "dotenv";
dotenv.config();

async function main() {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  const data = await res.json();
  const freeModels = data.data.filter((m) => m.id.endsWith(":free"));
  console.log("OpenRouter free models:", freeModels.map((m) => m.id));
}

main();
