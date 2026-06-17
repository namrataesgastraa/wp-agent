import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import type { ConversationMode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/conversations/[id] — update the agent/human mode. */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = (await req.json()) as { mode?: ConversationMode };
  const mode = body.mode;

  if (mode !== "agent" && mode !== "human") {
    return NextResponse.json(
      { error: "mode must be 'agent' or 'human'" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("conversations")
    .update({ mode })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation: data });
}
