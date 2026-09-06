import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { leadSchema } from "@/data/leads";

const requestSchema = z.object({
  accessToken: z.string().max(4096).optional(),
  businessId: z.string().uuid(),
  websiteId: z.string().uuid().optional(),
  lead: leadSchema,
});

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
