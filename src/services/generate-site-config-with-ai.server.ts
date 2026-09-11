import type { Lead } from "@/data/leads";
import type { BusinessResearchProfile } from "@/data/research";
import type { SiteConfig } from "@/data/site";
import type { GenerationQualityMode } from "@/data/site-generation";
import { siteConfigFromV3 } from "@/generation/adapters/site-config-v3";
import { generateSiteSpecV3 } from "@/generation/pipeline/generate-site-spec-v3.server";

type GenerateOptions = {
  qualityMode?: GenerationQualityMode;
  currentConfig?: SiteConfig;
  researchProfile?: BusinessResearchProfile;
  revisionInstruction?: string;
  recentDesigns?: Array<{ fingerprint: string; characteristics: unknown }>;
  renderAudit?: {
    viewport: { width: number; height: number };
    sectionGaps: Array<{ before: string; after: string; pixels: number }>;
    lowContrast: Array<{ text: string; ratio: number }>;
    horizontalOverflow: number;
  };
};

/**
 * New websites are authored from a staged V3 specification. SiteConfig is now
 * only the backwards-compatible persistence envelope used by publishing,
 * contact capture, accounts, and existing saved sites.
 */
export async function createAiSiteConfig(
  lead: Lead,
  options: GenerateOptions = {},
): Promise<SiteConfig> {
  try {
    const qualityMode = options.qualityMode ?? "studio";
    const result = await generateSiteSpecV3(lead, {
      qualityMode,
      ...(options.researchProfile ? { researchProfile: options.researchProfile } : {}),
      revisionInstruction: [
        options.revisionInstruction,
        options.renderAudit
          ? `Repair only these recorded render defects: ${JSON.stringify(options.renderAudit)}`
          : undefined,
      ]
        .filter(Boolean)
        .join("\n"),
      ...(options.recentDesigns ? { recentDesigns: options.recentDesigns } : {}),
    });
    return siteConfigFromV3({
      lead,
      spec: result.spec,
      qualityMode,
      telemetry: result.telemetry,
      revision: (options.currentConfig?.generation?.revision ?? 0) + 1,
    });
  } catch (error) {
    const apiError = error as {
      name?: unknown;
      message?: unknown;
      status?: unknown;
      code?: unknown;
      type?: unknown;
      request_id?: unknown;
    };
    console.error("Staged website generation failed", {
      name: apiError?.name,
      message: apiError?.message,
      status: apiError?.status,
      code: apiError?.code,
      type: apiError?.type,
      requestId: apiError?.request_id,
    });
    if (
      error instanceof Error &&
      (error.message.startsWith("Website generation failed during") ||
        error.message.startsWith("Generated website failed") ||
        error.message.includes("not configured"))
    ) {
      throw error;
    }
    throw new Error("Website generation could not complete its quality pipeline. Please retry.");
  }
}
