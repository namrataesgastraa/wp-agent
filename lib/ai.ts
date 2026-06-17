import OpenAI from "openai";
import type { Message } from "./types";

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant. Keep replies concise and friendly.";

/** OpenRouter is OpenAI-compatible — point the SDK at its base URL. */
function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY env var");
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/whatsapp-ai-agent",
      "X-Title": "WhatsApp AI Agent",
    },
  });
}

/**
 * Generate an AI reply given the conversation history (oldest → newest).
 */
export async function generateAIReply(history: Message[]): Promise<string> {
  const client = getClient();
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const systemPrompt = process.env.AI_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  const reply = completion.choices[0]?.message?.content?.trim();
  return reply || "Sorry, I couldn't generate a response right now.";
}
