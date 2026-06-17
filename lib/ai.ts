import OpenAI from "openai";
import type { Message } from "./types";
import { buildSystemPrompt } from "./esgastraa-config";

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const MAX_RETRIES = 3;

/** OpenRouter is OpenAI-compatible — point the SDK at its base URL. */
function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY env var");
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://www.esgastraa.com",
      "X-Title": "ESGastraa WhatsApp Assistant",
    },
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Generate Astra's reply given the conversation history (oldest → newest).
 * Retries on transient 429/5xx errors with exponential backoff so a temporarily
 * rate-limited model doesn't drop the reply.
 */
export async function generateAIReply(history: Message[]): Promise<string> {
  const client = getClient();
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  // The ESGastraa "Astra" prompt is ALWAYS used. AI_SYSTEM_PROMPT, if set, is
  // only appended as extra guidance — it can never replace the knowledge base.
  const extra = process.env.AI_SYSTEM_PROMPT?.trim();
  const systemPrompt = extra
    ? `${buildSystemPrompt()}\n\n=== ADDITIONAL INSTRUCTIONS ===\n${extra}`
    : buildSystemPrompt();

  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
      });
      const reply = completion.choices[0]?.message?.content?.trim();
      if (reply) return reply;
      lastErr = new Error("Empty completion");
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number }).status;
      // Only retry on rate-limit / server errors.
      if (status === 429 || (status && status >= 500)) {
        const wait = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s
        console.warn(
          `AI call failed (status ${status}), retry ${attempt + 1}/${MAX_RETRIES} in ${wait}ms`
        );
        await sleep(wait);
        continue;
      }
      break; // non-retryable
    }
  }

  console.error("AI generation failed after retries:", lastErr);
  return "Thanks for your message! 🌱 Our team will get back to you shortly. For urgent queries, email hello@esgastraa.com.";
}
