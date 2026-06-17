import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import type { Conversation, ConversationWithLast, Message } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/conversations — all conversations with a last-message preview. */
export async function GET() {
  const supabase = getServiceClient();

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const convos = (conversations as Conversation[]) ?? [];
  if (convos.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  // Pull the latest message per conversation in one query, then map in memory.
  const { data: recent } = await supabase
    .from("messages")
    .select("conversation_id, content, created_at")
    .in(
      "conversation_id",
      convos.map((c) => c.id)
    )
    .order("created_at", { ascending: false });

  const lastByConvo = new Map<string, Pick<Message, "content" | "created_at">>();
  for (const m of (recent as Message[]) ?? []) {
    if (!lastByConvo.has(m.conversation_id)) {
      lastByConvo.set(m.conversation_id, {
        content: m.content,
        created_at: m.created_at,
      });
    }
  }

  const result: ConversationWithLast[] = convos.map((c) => {
    const last = lastByConvo.get(c.id);
    return {
      ...c,
      last_message: last?.content ?? null,
      last_message_at: last?.created_at ?? null,
    };
  });

  return NextResponse.json({ conversations: result });
}
