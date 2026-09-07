import type { SupportContactMessage } from "./support-contact-message-schema";

function deny(status: number, error: string): never {
  throw new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
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

  const { error: insertError } = await client.from("support_contact_messages").insert({
    name: data.name || null,
    email: data.email,
    message: data.message,
  });
  if (insertError) {
    console.error("Upvero support message could not be saved", { error: insertError.message });
    deny(503, "The contact form is temporarily unavailable. Please try again later.");
  }

  return { accepted: true };
}
