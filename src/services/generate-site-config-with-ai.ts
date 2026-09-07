import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { leadSchema } from "@/data/leads";

const requestSchema = z.object({
  accessToken: z.string().max(4096).optional(),
  businessId: z.string().uuid(),
  websiteId: z.string().uuid().optional(),
  lead: leadSchema,
});

const ownedDraftRequestSchema = requestSchema.extend({ websiteId: z.string().uuid() });

async function validateRequest(data: unknown) {
  const parsed = requestSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  throw new Response(JSON.stringify({ error: "Invalid AI generation request." }), {
    status: 400,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Server RPC boundary; OpenAI credentials and implementation stay server-side. */
export const generateSiteConfigWithAI = createServerFn({ method: "POST" })
  .validator(validateRequest)
  .handler(async ({ data }) => {
    const { authorizeProviderOperation } =
      await import("./provider-operation-authorization.server");
    await authorizeProviderOperation(data, { operation: "ai_generation", adminOnly: true });
    const { createAiSiteConfig } = await import("./generate-site-config-with-ai.server");
    return createAiSiteConfig(data.lead);
  });

/**
 * Generates copy for an already-created customer draft. The draft must exist
 * first so identity, ownership, and the server-side quota boundary are all
 * verified before the OpenAI module is imported or a paid call is made.
 */
export const generateOwnedDraftSiteConfigWithAI = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const parsed = ownedDraftRequestSchema.safeParse(data);
    if (parsed.success) return parsed.data;
    throw new Response(JSON.stringify({ error: "Invalid AI generation request." }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  })
  .handler(async ({ data }) => {
    const { authorizeProviderOperation } =
      await import("./provider-operation-authorization.server");
    const { client, user } = await authorizeProviderOperation(data, { operation: "ai_generation" });
    const { createAiSiteConfig } = await import("./generate-site-config-with-ai.server");
    const config = await createAiSiteConfig(data.lead);
    const { data: website, error } = await client
      .from("websites")
      .update({ site_config: config })
      .eq("id", data.websiteId)
      .eq("business_id", data.businessId)
      .eq("owner_id", user.id)
      .select("site_config")
      .maybeSingle();
    if (error || !website) {
      throw new Error("Unable to save your personalized website preview.");
    }
    return website.site_config;
  });
