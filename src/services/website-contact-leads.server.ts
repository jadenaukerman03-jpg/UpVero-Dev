import type { PublicWebsiteLead } from "./website-contact-lead-schema";
import { isPlausiblePublicFormTiming } from "@/lib/public-form-abuse";

function deny(status: number, error: string): never {
  throw new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * Public contact intake for rendered sites. Target IDs are verified by the
 * server, records are written only with the server client, and a target-scoped
 * quota runs before any insert. There are deliberately no browser database
 * grants for this table.
 */
export async function persistWebsiteContactLead(data: PublicWebsiteLead) {
  if (data.website) deny(400, "Unable to submit this inquiry.");
  if (!isPlausiblePublicFormTiming(data.startedAt)) deny(400, "Unable to submit this inquiry.");

  const { getPublicFormClientKey } = await import("@/lib/public-form-abuse.server");
  const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
  const client = createSupabaseAdminClient();
  const clientKey = getPublicFormClientKey("website-contact");
  let websiteId: string | null = null;
  let prospectDemoId: string | null = null;
  let quotaTarget: string;

  if (data.target.kind === "private_demo") {
    const { data: demo, error } = await client
      .from("prospect_demos")
      .select("id, expires_at")
      .eq("preview_token", data.target.token)
      .eq("status", "ready")
      .maybeSingle();
    if (error || !demo || (demo.expires_at && new Date(demo.expires_at) <= new Date())) {
      deny(404, "This contact form is unavailable.");
    }
    prospectDemoId = demo.id;
    quotaTarget = `demo:${demo.id}`;
  } else {
    const { data: website, error } = await client
      .from("websites")
      .select("id")
      .eq("id", data.target.websiteId)
      .eq("status", "published")
      .maybeSingle();
    if (error || !website) deny(404, "This contact form is unavailable.");
    websiteId = website.id;
    quotaTarget = `website:${website.id}`;
  }

  const { data: clientWithinQuota, error: clientQuotaError } = await client.rpc(
    "consume_website_contact_lead_quota",
    { p_target_key: `client:${clientKey}`, p_limit: 20 },
  );
  if (clientQuotaError || clientWithinQuota !== true) {
    deny(429, "This contact form has received too many requests. Please try again later.");
  }

  const { data: withinQuota, error: quotaError } = await client.rpc(
    "consume_website_contact_lead_quota",
    { p_target_key: quotaTarget, p_limit: 12 },
  );
  if (quotaError || withinQuota !== true) {
    deny(429, "This contact form has received too many requests. Please try again later.");
  }

  const { error: insertError } = await client.from("website_contact_leads").insert({
    website_id: websiteId,
    prospect_demo_id: prospectDemoId,
    name: data.name,
    contact_method: data.contactMethod,
    service: data.service || null,
    notes: data.notes || null,
  });
  if (insertError) {
    console.error("Website contact inquiry could not be saved", {
      target: quotaTarget,
      error: insertError.message,
    });
    deny(503, "This contact form is temporarily unavailable. Please try again later.");
  }

  return { accepted: true };
}
