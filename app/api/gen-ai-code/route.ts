import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { CREDIT_COST_PER_GENERATION } from "@/lib/constants";
import type { Message, FileData } from "@/types/workspace";
import { aj } from "@/lib/arcjet";
import { parseAndValidateAIResponse } from "@/lib/ai-parser";
import { assertEnv } from "@/lib/env";
import { getAIProvider, AIProviderError } from "@/lib/ai";

// Ensure required env variables are present
assertEnv();

// ─── SSE helper ───────────────────────────────────────────────────────────────

function sseEvent(type: string, payload: unknown): string {
  return `data: ${JSON.stringify({ type, ...(payload as object) })}\n\n`;
}

// ─── npm validation ───────────────────────────────────────────────────────────

async function validateDependencies(
  deps: Record<string, string>
): Promise<Record<string, string>> {
  const valid: Record<string, string> = {};
  await Promise.all(
    Object.entries(deps).map(async ([pkg, version]) => {
      try {
        const res = await fetch(`https://registry.npmjs.org/${pkg}/latest`, {
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok) valid[pkg] = version;
      } catch {
        // silently skip hallucinated packages
      }
    })
  );
  return valid;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { workspaceId, userId, messages, fileData } = body as {
    workspaceId: string | null;
    userId: string;
    messages: Message[];
    fileData: FileData | null;
  };

  if (!messages?.length) {
    return Response.json({ message: "No messages provided" }, { status: 400 });
  }

  // ── Arcjet security check ─────────────────────────────────────────────────
  if (process.env.ARCJET_KEY) {
    try {
      const arcjetReq = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(body),
      });

      const lastUserMessage =
        [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
      const decision = await aj.protect(arcjetReq, {
        requested: 1,
        userId: clerkId,
        detectPromptInjectionMessage: lastUserMessage,
      });

      if (decision.isDenied()) {
        return Response.json(
          { message: decision.reason?.type ?? "Request blocked by security rules" },
          { status: 429 }
        );
      }
    } catch (arcjetErr) {
      console.warn("[gen-ai-code] Arcjet non-fatal check error:", arcjetErr);
    }
  }

  const user = await db.user.findUnique({
    where: { id: userId, clerkId },
    select: { id: true, credits: true },
  });

  if (!user)
    return Response.json({ message: "User not found" }, { status: 404 });
  if (user.credits < CREDIT_COST_PER_GENERATION) {
    return Response.json({ message: "Insufficient credits" }, { status: 402 });
  }

  // ── Call AI Provider via abstraction ───────────────────────────────────────

  let rawText = "";
  try {
    const provider = getAIProvider();
    const result = await provider.generateApplication({ messages, fileData });
    rawText = result.rawText;
  } catch (err: unknown) {
    if (err instanceof AIProviderError) {
      console.error(
        `[gen-ai-code] Provider ${err.provider} error (HTTP ${err.status}): ${err.message}`
      );
      return Response.json({ message: err.message }, { status: err.status });
    }
    const errorMsg = err instanceof Error ? err.message : "AI generation failed. Please try again.";
    console.error("[gen-ai-code] AI Provider error:", err);
    return Response.json({ message: errorMsg }, { status: 500 });
  }

  const encoder = new TextEncoder();


  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // ignore controller enqueue errors if client disconnected
        }
      };

      try {
        // ── Parse and validate complete JSON response ──────────────────────────

        enqueue(
          sseEvent("status", { message: "Validating generated component schema…" })
        );

        let appData;
        try {
          appData = parseAndValidateAIResponse(rawText);
        } catch (parseErr) {
          console.error("[gen-ai-code] parsing error:", parseErr);
          enqueue(
            sseEvent("error", {
              message: "AI returned invalid response format. Please try again.",
            })
          );
          controller.close();
          return;
        }

        const {
          assistantMessage,
          title: aiTitle,
          files,
          dependencies,
        } = appData;

        // ── Validate npm packages ──────────────────────────────────────────────

        enqueue(sseEvent("status", { message: "Validating npm packages…" }));
        const validatedDeps = await validateDependencies(dependencies ?? {});
        const newFileData: FileData = {
          files,
          dependencies: validatedDeps,
          title: aiTitle,
        };

        // ── Upsert workspace + deduct credit (single transaction) ──────────────

        enqueue(sseEvent("status", { message: "Saving project workspace…" }));

        const lastUserMessage = messages[messages.length - 1];
        const updatedMessages: Message[] = [
          ...messages,
          { role: "assistant", content: assistantMessage },
        ];

        const [workspace] = await db.$transaction([
          workspaceId
            ? db.workspace.update({
                where: { id: workspaceId, userId },
                data: {
                  messages: updatedMessages as never,
                  fileData: newFileData as never,
                },
              })
            : db.workspace.create({
                data: {
                  userId,
                  title: aiTitle ?? lastUserMessage.content.slice(0, 80),
                  messages: updatedMessages as never,
                  fileData: newFileData as never,
                },
              }),
          db.user.update({
            where: { id: userId },
            data: { credits: { decrement: CREDIT_COST_PER_GENERATION } },
          }),
        ]);

        const updatedUser = await db.user.findUnique({
          where: { id: userId },
          select: { credits: true },
        });

        // ── Emit final result ──────────────────────────────────────────────────

        enqueue(
          sseEvent("done", {
            workspaceId: workspace.id,
            assistantMessage,
            fileData: newFileData,
            creditsRemaining:
              updatedUser?.credits ?? user.credits - CREDIT_COST_PER_GENERATION,
          })
        );
      } catch (err) {
        console.error("[gen-ai-code] stream processing error:", err);
        enqueue(
          sseEvent("error", {
            message:
              err instanceof Error
                ? err.message
                : "Something went wrong. Please try again.",
          })
        );
      } finally {
        try {
          controller.close();
        } catch {
          // ignore if already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export const runtime = "nodejs";
export const maxDuration = 300;
