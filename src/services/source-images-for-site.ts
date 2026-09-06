import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { leadSchema } from "@/data/leads";
const sourcingRequestSchema = z.object({
  accessToken: z.string().max(4096).optional(),
  businessId: z.string().uuid(),
  websiteId: z.string().uuid().optional(),
  lead: leadSchema,
  style: z.enum(["professional", "modern", "luxury", "friendly", "minimal"]),
  sections: z
    .array(z.enum(["hero", "about"]))
    .min(1)
    .max(2)
    .optional(),
});

async function validateRequest(data: unknown) {
  const parsed = sourcingRequestSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  throw new Response(JSON.stringify({ error: "Invalid image sourcing request." }), {
    status: 400,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Server RPC boundary for Pexels-only image sourcing. */
export const sourceImagesForSiteServer = createServerFn({ method: "POST" })
  .validator(validateRequest)
  .handler(async ({ data }) => {
    const { authorizeProviderOperation } =
      await import("./provider-operation-authorization.server");
    await authorizeProviderOperation(data, { operation: "image_sourcing", adminOnly: true });
    const { sourceImagesForSite } = await import("./source-images-for-site.server");
    return sourceImagesForSite(data);
  });
