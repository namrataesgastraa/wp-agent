import { NextRequest, NextResponse } from "next/server";
import {
  findOrCreateConversation,
  insertMessage,
  getRecentHistory,
} from "@/lib/db";
import { generateAIReply } from "@/lib/ai";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import type { WhatsAppWebhookBody, WhatsAppMessage } from "@/lib/types";

export const runtime = "nodejs";
// Don't cache — every webhook delivery must execute.
export const dynamic = "force-dynamic";

/**
 * GET /api/webhook — Meta webhook verification handshake.
 * Echo back hub.challenge when the verify token matches.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST /api/webhook — incoming messages from Meta.
 * Always return 200 quickly; do the work, but never let an error become a 500
 * (that would make Meta retry the same delivery).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WhatsAppWebhookBody;

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: true });
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        // Ignore status updates (delivered/read) — only handle inbound messages.
        if (!value?.messages?.length) continue;

        const contactName = value.contacts?.[0]?.profile?.name ?? null;

        for (const msg of value.messages) {
          await handleInboundMessage(msg, contactName);
        }
      }
    }
  } catch (err) {
    // Log but still 200 — we don't want Meta to hammer us with retries.
    console.error("Webhook processing error:", err);
  }

  return NextResponse.json({ ok: true });
}

async function handleInboundMessage(
  msg: WhatsAppMessage,
  contactName: string | null
) {
  // Only text messages are supported for now.
  if (msg.type !== "text" || !msg.text?.body) return;

  const phone = msg.from;
  const text = msg.text.body;

  const conversation = await findOrCreateConversation(phone, contactName);

  // Store the inbound message (deduped on whatsapp_msg_id).
  const { inserted } = await insertMessage({
    conversationId: conversation.id,
    role: "user",
    content: text,
    whatsappMsgId: msg.id,
  });

  // Duplicate delivery → we've already processed this one. Stop.
  if (!inserted) return;

  // Human mode: store only, let the operator reply from the dashboard.
  if (conversation.mode === "human") return;

  // Agent mode: generate and send an AI reply.
  const history = await getRecentHistory(conversation.id);
  const reply = await generateAIReply(history);

  const sendResult = await sendWhatsAppMessage(phone, reply);
  const outboundId = sendResult.messages?.[0]?.id ?? null;

  await insertMessage({
    conversationId: conversation.id,
    role: "assistant",
    content: reply,
    whatsappMsgId: outboundId,
  });
}
