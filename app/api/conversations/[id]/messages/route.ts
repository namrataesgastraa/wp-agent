import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import type { Message } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/conversations/[id]/messages — full history for a conversation. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: (data as Message[]) ?? [] });
}
