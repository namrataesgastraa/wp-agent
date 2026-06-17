const GRAPH_VERSION = "v22.0";

/**
 * Send a plain-text WhatsApp message via the Meta Graph API.
 * Returns the parsed JSON response (contains the message id on success).
 */
export async function sendWhatsAppMessage(to: string, body: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error(
      "Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN env vars"
    );
  }

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body },
      }),
    }
  );

  const json = await res.json();
  if (!res.ok) {
    console.error("WhatsApp send failed:", JSON.stringify(json));
    throw new Error(`WhatsApp API error ${res.status}`);
  }
  return json as { messages?: { id: string }[] };
}
