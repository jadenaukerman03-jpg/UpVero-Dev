import type { ResearchQuery } from "@/data/research";

export async function researchBusinessFromQuery(data: ResearchQuery) {
  try {
    const { mockResearchProvider, researchBusiness } = await import("./business-research");
    const { openAiWebSearchProvider } = await import("./openai-web-search-provider.server");
    const provider = data.providerMode === "mock" ? mockResearchProvider : openAiWebSearchProvider;
    return await researchBusiness(data, [provider]);
  } catch (error) {
    console.error("Business research pipeline failed", error);
    throw error instanceof Error
      ? error
      : new Error("Research provider error: unable to complete the research job.");
  }
}
