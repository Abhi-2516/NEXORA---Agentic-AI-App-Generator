// lib/env.ts
// Environment variable validation utility

const BASE_REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "ARCJET_KEY",
] as const;

export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const envVar of BASE_REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase().trim();
  if (provider === "gemini" && !process.env.GEMINI_API_KEY) {
    missing.push("GEMINI_API_KEY");
  } else if (provider === "groq" && !process.env.GROQ_API_KEY) {
    missing.push("GROQ_API_KEY");
  } else if (provider === "openrouter" && !process.env.OPENROUTER_API_KEY) {
    missing.push("OPENROUTER_API_KEY");
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function assertEnv(): void {
  const { valid, missing } = validateEnv();
  if (!valid) {
    const errorMsg = `[NEXORA Config Error] Missing required environment variables: ${missing.join(", ")}. Please set them in your .env file.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

