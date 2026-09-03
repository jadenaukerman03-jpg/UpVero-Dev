import { createServerFn } from "@tanstack/react-start";

import { leadSchema } from "@/data/leads";

/** Server RPC boundary; OpenAI credentials and implementation stay server-side. */
export const generateSiteConfigWithAI = createServerFn({ method: "POST" })
  .validator((data: unknown) => leadSchema.parse(data))
  .handler(async ({ data }) => {
    const { createAiSiteConfig } = await import("./generate-site-config-with-ai.server");
    return createAiSiteConfig(data);
  });
