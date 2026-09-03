import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { leadSchema } from "@/data/leads";
const sourcingRequestSchema = z.object({
  lead: leadSchema,
  style: z.enum(["professional", "modern", "luxury", "friendly", "minimal"]),
  sections: z.array(z.enum(["hero", "about"])).min(1).max(2).optional(),
});

/** Server RPC boundary for Pexels-only image sourcing. */
export const sourceImagesForSiteServer = createServerFn({ method: "POST" })
  .validator((data: unknown) => sourcingRequestSchema.parse(data))
  .handler(async ({ data }) => {
    const { sourceImagesForSite } = await import("./source-images-for-site.server");
    return sourceImagesForSite(data);
  });
