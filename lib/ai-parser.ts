// lib/ai-parser.ts
import { jsonrepair } from "jsonrepair";
import { z } from "zod";

export const aiGeneratedAppSchema = z.object({
  assistantMessage: z.string().default("Application generated successfully."),
  title: z.string().optional().default("React Application"),
  files: z.record(
    z.string(),
    z.object({
      code: z.string(),
    })
  ),
  dependencies: z.record(z.string(), z.string()).optional().default({}),
});

export type AIGeneratedApp = z.infer<typeof aiGeneratedAppSchema>;

function validateAndNormalize(parsed: unknown): AIGeneratedApp {
  const validationResult = aiGeneratedAppSchema.safeParse(parsed);

  if (!validationResult.success) {
    // Check if files property exists in raw object and attempt safe recovery
    if (parsed && typeof parsed === "object" && "files" in parsed) {
      const rawObj = parsed as Record<string, unknown>;
      if (rawObj.files && typeof rawObj.files === "object") {
        const normalizedFiles: Record<string, { code: string }> = {};
        for (const [k, v] of Object.entries(rawObj.files as Record<string, unknown>)) {
          const pathKey = k.startsWith("/") ? k : `/${k}`;
          if (typeof v === "string") {
            normalizedFiles[pathKey] = { code: v };
          } else if (
            v &&
            typeof v === "object" &&
            "code" in v &&
            typeof (v as Record<string, unknown>).code === "string"
          ) {
            normalizedFiles[pathKey] = {
              code: (v as Record<string, unknown>).code as string,
            };
          }
        }

        if (Object.keys(normalizedFiles).length > 0) {
          const coerced: AIGeneratedApp = {
            assistantMessage:
              typeof rawObj.assistantMessage === "string"
                ? rawObj.assistantMessage
                : "App generated successfully.",
            title: typeof rawObj.title === "string" ? rawObj.title : "React App",
            files: normalizedFiles,
            dependencies: (rawObj.dependencies as Record<string, string>) || {},
          };
          return ensureEntryPoint(coerced);
        }
      }
    }
    throw new Error(
      `Invalid AI response schema: ${validationResult.error.message}`
    );
  }

  // Normalize file keys (ensure leading slash) and check entry point
  const app = validationResult.data;
  const normalizedFiles: Record<string, { code: string }> = {};
  for (const [key, val] of Object.entries(app.files)) {
    const formattedKey = key.startsWith("/") ? key : `/${key}`;
    normalizedFiles[formattedKey] = val;
  }
  app.files = normalizedFiles;

  return ensureEntryPoint(app);
}

export function parseAndValidateAIResponse(rawText: string): AIGeneratedApp {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Empty AI response received.");
  }

  const trimmed = rawText.trim();

  // 1. Try markdown code block extraction
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const snippet = codeBlockMatch[1].trim();
    try {
      return validateAndNormalize(JSON.parse(snippet));
    } catch {
      try {
        return validateAndNormalize(JSON.parse(jsonrepair(snippet)));
      } catch {
        // Fall back to whole string parsing
      }
    }
  }

  // 2. Try clean string parsing
  let cleaned = trimmed;
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return validateAndNormalize(JSON.parse(cleaned));
  } catch {
    try {
      const repaired = jsonrepair(cleaned);
      return validateAndNormalize(JSON.parse(repaired));
    } catch (repairErr) {
      throw new Error(
        `Failed to parse AI output as JSON: ${
          repairErr instanceof Error ? repairErr.message : String(repairErr)
        }`
      );
    }
  }
}

function ensureEntryPoint(app: AIGeneratedApp): AIGeneratedApp {
  // Sandpack entry point requirement: must have /App.js
  if (!app.files["/App.js"]) {
    // If App.jsx or src/App.js exists, copy/alias to /App.js
    const altKey = Object.keys(app.files).find(
      (k) =>
        k === "/App.jsx" ||
        k === "/App.tsx" ||
        k === "/src/App.js" ||
        k === "/src/App.tsx"
    );
    if (altKey) {
      app.files["/App.js"] = app.files[altKey];
    } else {
      // Use the first available file as App.js if none matches
      const firstFileKey = Object.keys(app.files)[0];
      if (firstFileKey) {
        app.files["/App.js"] = app.files[firstFileKey];
      }
    }
  }
  return app;
}
