import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { leadSchema } from "@/data/leads";
import { siteConfigSchema, validateSiteConfig, type SiteConfig } from "@/data/site";
import { generationQualityModes } from "@/data/site-generation";

const requestSchema = z.object({
  accessToken: z.string().max(4096).optional(),
  businessId: z.string().uuid(),
  websiteId: z.string().uuid().optional(),
  lead: leadSchema,
  qualityMode: z.enum(generationQualityModes).default("studio"),
});

const ownedDraftRequestSchema = requestSchema.extend({ websiteId: z.string().uuid() });

const renderAuditSchema = z.object({
  viewport: z.object({
    width: z.number().int().min(240).max(10000),
    height: z.number().int().min(240).max(10000),
  }),
  sectionGaps: z
    .array(
      z.object({
        before: z.string().max(100),
        after: z.string().max(100),
        pixels: z.number().min(0).max(5000),
      }),
    )
    .max(30),
  lowContrast: z
    .array(z.object({ text: z.string().max(160), ratio: z.number().min(0).max(30) }))
    .max(30),
  horizontalOverflow: z.number().min(0).max(10000),
});

const refineOwnedDraftRequestSchema = ownedDraftRequestSchema.extend({
  instruction: z.string().trim().min(3).max(1200),
  renderAudit: renderAuditSchema.optional(),
});

async function recordGenerationStart(input: {
  ownerId: string;
  businessId: string;
  websiteId?: string;
  qualityMode: "efficient" | "studio" | "signature";
}) {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
  const { data, error } = await createSupabaseAdminClient()
    .from("website_generation_runs")
    .insert({
      owner_id: input.ownerId,
      business_id: input.businessId,
      website_id: input.websiteId ?? null,
      quality_mode: input.qualityMode,
      status: "started",
    })
    .select("id")
    .maybeSingle();
  if (error) console.error("Unable to start website generation ledger entry", { code: error.code });
  return data?.id as string | undefined;
}

async function completeGenerationRun(
  runId: string | undefined,
  config: SiteConfig | undefined,
  error?: unknown,
) {
  if (!runId) return;
  const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
  const generation = config?.generation;
  const { error: updateError } = await createSupabaseAdminClient()
    .from("website_generation_runs")
    .update({
      status: error ? "failed" : "completed",
      input_tokens: generation?.inputTokens ?? 0,
      output_tokens: generation?.outputTokens ?? 0,
      estimated_cost_cents: generation?.estimatedCostCents ?? 0,
      actual_cost_cents: generation?.actualCostCents ?? 0,
      quality_score: generation?.qualityScore ?? null,
      models: generation?.models ?? [],
      error_code: error ? "generation_failed" : null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (updateError)
    console.error("Unable to complete website generation ledger entry", { code: updateError.code });
}

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
    return createAiSiteConfig(data.lead, { qualityMode: data.qualityMode });
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
    const { data: existingWebsite, error: existingError } = await client
      .from("websites")
      .select("site_config")
      .eq("id", data.websiteId)
      .eq("business_id", data.businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (existingError || !existingWebsite) throw new Error("This website draft is unavailable.");
    const existingConfig = siteConfigSchema.safeParse(existingWebsite.site_config);
    const runId = await recordGenerationStart({
      ownerId: user.id,
      businessId: data.businessId,
      websiteId: data.websiteId,
      qualityMode: data.qualityMode,
    });
    const { createAiSiteConfig } = await import("./generate-site-config-with-ai.server");
    let generatedConfig;
    try {
      generatedConfig = await createAiSiteConfig(data.lead, { qualityMode: data.qualityMode });
    } catch (error) {
      await completeGenerationRun(runId, undefined, error);
      throw error;
    }
    const primaryColor = existingConfig.success
      ? existingConfig.data.design?.primaryColor
      : undefined;
    const config = primaryColor
      ? {
          ...generatedConfig,
          design: { ...generatedConfig.design, primaryColor },
        }
      : generatedConfig;
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
    await completeGenerationRun(runId, validateSiteConfig(website.site_config));
    return website.site_config;
  });

/** Secure conversational/render-aware revision of an already-owned draft. */
export const refineOwnedDraftSiteConfigWithAI = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const parsed = refineOwnedDraftRequestSchema.safeParse(data);
    if (parsed.success) return parsed.data;
    throw new Response(JSON.stringify({ error: "Invalid website refinement request." }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  })
  .handler(async ({ data }) => {
    const { authorizeProviderOperation } =
      await import("./provider-operation-authorization.server");
    const { client, user } = await authorizeProviderOperation(data, { operation: "ai_generation" });
    const { data: existingWebsite, error: existingError } = await client
      .from("websites")
      .select("site_config")
      .eq("id", data.websiteId)
      .eq("business_id", data.businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (existingError || !existingWebsite) throw new Error("This website draft is unavailable.");
    const currentConfig = validateSiteConfig(existingWebsite.site_config);
    const runId = await recordGenerationStart({
      ownerId: user.id,
      businessId: data.businessId,
      websiteId: data.websiteId,
      qualityMode: data.qualityMode,
    });
    const { createAiSiteConfig } = await import("./generate-site-config-with-ai.server");
    let revised;
    try {
      revised = await createAiSiteConfig(data.lead, {
        qualityMode: data.qualityMode,
        currentConfig,
        revisionInstruction: data.instruction,
        ...(data.renderAudit ? { renderAudit: data.renderAudit } : {}),
      });
    } catch (error) {
      await completeGenerationRun(runId, undefined, error);
      throw error;
    }
    const config = {
      ...revised,
      design: {
        ...revised.design,
        ...(currentConfig.design?.primaryColor
          ? { primaryColor: currentConfig.design.primaryColor }
          : {}),
      },
      assets: currentConfig.assets,
      ...(currentConfig.assetAttributions
        ? { assetAttributions: currentConfig.assetAttributions }
        : {}),
    };
    const validated = validateSiteConfig(config);
    const { data: website, error } = await client
      .from("websites")
      .update({ site_config: validated })
      .eq("id", data.websiteId)
      .eq("business_id", data.businessId)
      .eq("owner_id", user.id)
      .select("site_config")
      .maybeSingle();
    if (error || !website) throw new Error("Unable to save the refined website preview.");
    await completeGenerationRun(runId, validateSiteConfig(website.site_config));
    return website.site_config;
  });
