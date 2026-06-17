import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/esgastraa-config";
import { generateAIReply } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — diagnostic. Reports which code/prompt is actually deployed
 * so we can confirm Vercel is serving the latest commit. Exposes no secrets.
 * Pass ?test=<message> to generate (but NOT send) an AI reply for verification.
 */
export async function GET(req: NextRequest) {
  const test = req.nextUrl.searchParams.get("test");
  if (test) {
    try {
      const reply = await generateAIReply([
        {
          id: "t",
          conversation_id: "t",
          role: "user",
          content: test,
          whatsapp_msg_id: null,
          created_at: new Date().toISOString(),
        },
      ]);
      return NextResponse.json({ test, reply });
    } catch (e) {
      return NextResponse.json({ test, error: (e as Error).message });
    }
  }

  let promptPreview = "ERROR: buildSystemPrompt failed";
  let promptLength = 0;
  try {
    const p = buildSystemPrompt();
    promptPreview = p.slice(0, 80);
    promptLength = p.length;
  } catch (e) {
    promptPreview = "ERROR: " + (e as Error).message;
  }

  return NextResponse.json({
    marker: "esgastraa-v3-health",
    model: process.env.OPENROUTER_MODEL || "(unset)",
    aiSystemPromptEnvSet: Boolean(process.env.AI_SYSTEM_PROMPT),
    promptLength,
    promptPreview,
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
    hasSupabase: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
