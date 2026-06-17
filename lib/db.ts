import { getServiceClient } from "./supabase";
import type { Conversation, Message, MessageRole } from "./types";

/** Find an existing conversation by phone, or create one. Refreshes name if provided. */
export async function findOrCreateConversation(
  phone: string,
  name?: string | null
): Promise<Conversation> {
  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    if (name && name !== existing.name) {
      await supabase
        .from("conversations")
        .update({ name })
        .eq("id", existing.id);
      existing.name = name;
    }
    return existing as Conversation;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ phone, name: name ?? null })
    .select("*")
    .single();

  if (error) throw error;
  return data as Conversation;
}

/**
 * Insert a message. `whatsappMsgId` is used to dedupe Meta retries — a duplicate
 * insert hits the unique constraint, which we swallow and report via `inserted`.
 */
export async function insertMessage(params: {
  conversationId: string;
  role: MessageRole;
  content: string;
  whatsappMsgId?: string | null;
}): Promise<{ message: Message | null; inserted: boolean }> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      role: params.role,
      content: params.content,
      whatsapp_msg_id: params.whatsappMsgId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    // 23505 = unique_violation → duplicate webhook delivery, safe to ignore.
    if ((error as { code?: string }).code === "23505") {
      return { message: null, inserted: false };
    }
    throw error;
  }

  // Bump conversation ordering on every new message.
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.conversationId);

  return { message: data as Message, inserted: true };
}

/** Fetch the last N messages for a conversation, oldest → newest (for AI context). */
export async function getRecentHistory(
  conversationId: string,
  limit = 20
): Promise<Message[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data as Message[]) ?? []).reverse();
}
