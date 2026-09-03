import { createServerFn } from "@tanstack/react-start";

import { researchQuerySchema } from "@/data/research";

/** Server RPC boundary; providers and credentials remain server-side. */
export const researchBusinessServer = createServerFn({ method: "POST" })
  .validator((data: unknown) => researchQuerySchema.parse(data))
  .handler(async ({ data }) => {
    const { researchBusinessFromQuery } = await import("./research-business.server");
    return researchBusinessFromQuery(data);
  });
