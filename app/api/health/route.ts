import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/esgastraa-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — lightweight diagnostic. Reports which code/prompt is
 * deployed (no secrets, no model calls).
 */
export async function GET() {

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
