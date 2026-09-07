import type { SupportContactMessage } from "./support-contact-message-schema";

function deny(status: number, error: string): never {
  throw new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function sendSupportContactNotification(
  messageId: string,
  data: SupportContactMessage,
): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  const recipient = process.env["UPVERO_SUPPORT_NOTIFICATION_EMAIL"];
  const from = process.env["UPVERO_SUPPORT_FROM_EMAIL"];

  if (!apiKey || !recipient || !from) {
    console.warn("Support email notification is not configured; message remains saved securely.");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `support-contact/${messageId}`,
      "User-Agent": "upvero-support-contact/1.0",
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      reply_to: data.email,
      subject: `Upvero contact message from ${data.name || "a visitor"}`,
      text: [`Name: ${data.name || "Not provided"}`, `Email: ${data.email}`, "", data.message].join(
        "\n",
      ),
    }),
  });

  if (!response.ok) {
    console.error("Upvero support email notification failed", { status: response.status });
  }
}

export async function persistSupportContactMessage(data: SupportContactMessage) {
  if (data.website) deny(400, "Unable to send your message.");

  const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
  const client = createSupabaseAdminClient();
  const { data: withinQuota, error: quotaError } = await client.rpc(
    "consume_support_contact_message_quota",
    { p_target_key: "public-contact", p_limit: 30 },
  );
  if (quotaError || withinQuota !== true) {
    deny(429, "The contact form is temporarily busy. Please try again later.");
  }

  const { data: savedMessage, error: insertError } = await client
    .from("support_contact_messages")
    .insert({
      name: data.name || null,
      email: data.email,
      message: data.message,
    })
    .select("id")
    .single();
  if (insertError || !savedMessage) {
    console.error("Upvero support message could not be saved", { error: insertError?.message });
    deny(503, "The contact form is temporarily unavailable. Please try again later.");
  }

  await sendSupportContactNotification(savedMessage.id, data).catch((error: unknown) => {
    console.error("Upvero support email notification could not be delivered", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  });

  return { accepted: true };
}
