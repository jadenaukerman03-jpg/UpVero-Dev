import { createServerFn } from "@tanstack/react-start";

import { researchQuerySchema } from "@/data/research";
import { mockResearchProvider, researchBusiness } from "./business-research";
import { openAiWebSearchProvider } from "./openai-web-search-provider.server";

/** Server-only research orchestration entry point. Providers and future secrets stay off the client. */
export const researchBusinessServer = createServerFn({ method: "POST" })
  .validator((data: unknown) => researchQuerySchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const provider = data.providerMode === "mock" ? mockResearchProvider : openAiWebSearchProvider;
      return await researchBusiness(data, [provider]);
    } catch (error) {
      console.error("Business research pipeline failed", error);
      throw error instanceof Error
        ? error
        : new Error("Research provider error: unable to complete the research job.");
    }
  });
