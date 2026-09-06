import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { researchQuerySchema } from "@/data/research";

const requestSchema = z.object({
  accessToken: z.string().max(4096).optional(),
  businessId: z.string().uuid(),
  websiteId: z.string().uuid().optional(),
  query: researchQuerySchema,
});

async function validateRequest(data: unknown) {
  const parsed = requestSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  throw new Response(JSON.stringify({ error: "Invalid research request." }), {
    status: 400,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Server RPC boundary; providers and credentials remain server-side. */
export const researchBusinessServer = createServerFn({ method: "POST" })
  .validator(validateRequest)
  .handler(async ({ data }) => {
    const { authorizeProviderOperation } =
      await import("./provider-operation-authorization.server");
    await authorizeProviderOperation(data, { operation: "business_research", adminOnly: true });
    const { researchBusinessFromQuery } = await import("./research-business.server");
    return researchBusinessFromQuery(data.query);
  });
