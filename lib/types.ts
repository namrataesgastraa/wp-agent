export type ConversationMode = "agent" | "human";
export type MessageRole = "user" | "assistant";

export interface Conversation {
  id: string;
  phone: string;
  name: string | null;
  mode: ConversationMode;
  updated_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  whatsapp_msg_id: string | null;
  created_at: string;
}

/** A conversation row joined with its most recent message, for the sidebar. */
export interface ConversationWithLast extends Conversation {
  last_message: string | null;
  last_message_at: string | null;
}

// ── Meta WhatsApp webhook payload shapes (only the fields we use) ──
export interface WhatsAppWebhookBody {
  object: string;
  entry?: WhatsAppEntry[];
}

interface WhatsAppEntry {
  id: string;
  changes?: WhatsAppChange[];
}

interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

interface WhatsAppValue {
  messaging_product?: string;
  metadata?: { display_phone_number: string; phone_number_id: string };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: unknown[];
}

interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}
