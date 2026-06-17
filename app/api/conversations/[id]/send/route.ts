import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { insertMessage } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import type { Conversation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/conversations/[id]/send — operator sends a manual reply.
 * Works in both modes: delivers via Meta and stores as an assistant message.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = (await req.json()) as { content?: string };
  const content = body.content?.trim();

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !conversation) {
    return NextResponse.json(
      { error: "conversation not found" },
      { status: 404 }
    );
  }

  const convo = conversation as Conversation;

  let outboundId: string | null = null;
  try {
    const sendResult = await sendWhatsAppMessage(convo.phone, content);
    outboundId = sendResult.messages?.[0]?.id ?? null;
  } catch (err) {
    console.error("Manual send failed:", err);
    return NextResponse.json(
      { error: "Failed to deliver message via WhatsApp" },
      { status: 502 }
    );
  }

  const { message } = await insertMessage({
    conversationId: convo.id,
    role: "assistant",
    content,
    whatsappMsgId: outboundId,
  });

  return NextResponse.json({ message });
}
