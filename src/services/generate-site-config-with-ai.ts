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

  if (!error && config?.siteSpecV3) {
    const client = createSupabaseAdminClient();
    const { data: run } = await client
      .from("website_generation_runs")
      .select("owner_id")
      .eq("id", runId)
      .maybeSingle();
    const stages = config.generation?.stages ?? [];
    const stageRows = stages.map((stage, index) => ({
      run_id: runId,
      stage_name: stage.name,
      attempt: Math.max(1, Math.min(4, stage.attempts)),
      status: stage.status,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_cents: 0,
      error_summary: stage.error ?? null,
      started_at: new Date(Date.now() - stage.durationMs - index).toISOString(),
      completed_at: new Date().toISOString(),
    }));
    if (stageRows.length) {
      const { error: stageError } = await client
        .from("website_generation_stages")
        .upsert(stageRows, { onConflict: "run_id,stage_name,attempt" });
      if (stageError)
        console.error("Unable to persist website generation stages", { code: stageError.code });
    }
    const content = config.siteSpecV3;
    const contentHash = content.originality.fingerprint;
    const artifacts = [
      { artifact_type: "research-packet", content: content.research },
      { artifact_type: "strategy", content: content.strategy },
      { artifact_type: "architecture", content: content.architecture },
      { artifact_type: "design-system", content: content.designSystem },
      { artifact_type: "copy-deck", content: content.copy },
      { artifact_type: "composition", content: content.composition },
      { artifact_type: "media-plan", content: content.media },
      { artifact_type: "site-spec", content },
    ].map((artifact) => ({
      run_id: runId,
      artifact_type: artifact.artifact_type,
      schema_version: 3,
      content: artifact.content,
      content_hash: `${contentHash}:${artifact.artifact_type}`,
    }));
    const { error: artifactError } = await client
      .from("website_generation_artifacts")
      .insert(artifacts);
    if (artifactError)
      console.error("Unable to persist website generation artifact", { code: artifactError.code });
    if (run?.owner_id) {
      const { error: fingerprintError } = await client
        .from("website_generation_fingerprints")
        .upsert(
          {
            run_id: runId,
            owner_id: run.owner_id,
            fingerprint: contentHash,
            characteristics: {
              paths: content.architecture.pages.map((page) => page.path),
              sectionOrders: content.architecture.pages.map((page) =>
                page.sectionPlan.map((section) => section.purpose),
              ),
              layoutGrammar: content.composition.pages.flatMap((page) =>
                page.sections.map((section) => ({
                  columns: section.columns,
                  contentSpan: section.contentSpan,
                  mediaSpan: section.mediaSpan,
                  align: section.align,
                  itemTreatment: section.itemTreatment,
                  mediaPlacement: section.mediaPlacement,
                  tone: section.tone,
                })),
              ),
              typography: [
                content.designSystem.typography.displayFamily,
                content.designSystem.typography.bodyFamily,
              ],
              surface: [
                content.designSystem.surfaces.radiusPx,
                content.designSystem.surfaces.shadow,
                content.designSystem.imagery.cornerTreatment,
              ],
            },
            quality_score: content.quality.score,
          },
          { onConflict: "run_id" },
        );
      if (fingerprintError)
        console.error("Unable to persist website originality fingerprint", {
          code: fingerprintError.code,
        });
    }
  }
}

async function validateRequest(data: unknown) {
  const parsed = requestSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  throw new Response(JSON.stringify({ error: "Invalid AI generation request." }), {
    status: 400,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function recentGenerationDesigns(ownerId: string) {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
  const { data, error } = await createSupabaseAdminClient()
    .from("website_generation_fingerprints")
    .select("fingerprint, characteristics")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return [];
  return (data ?? []).flatMap((entry) =>
    typeof entry.fingerprint === "string"
      ? [{ fingerprint: entry.fingerprint, characteristics: entry.characteristics }]
      : [],
  );
}

/** Server RPC boundary; OpenAI credentials and implementation stay server-side. */
export const generateSiteConfigWithAI = createServerFn({ method: "POST" })
  .validator(validateRequest)
  .handler(async ({ data }) => {
    const { authorizeProviderOperation } =
      await import("./provider-operation-authorization.server");
    const { user } = await authorizeProviderOperation(data, {
      operation: "ai_generation",
      adminOnly: true,
    });
    const { createAiSiteConfig } = await import("./generate-site-config-with-ai.server");
    return createAiSiteConfig(data.lead, {
      qualityMode: data.qualityMode,
      recentDesigns: await recentGenerationDesigns(user.id),
    });
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
      generatedConfig = await createAiSiteConfig(data.lead, {
        qualityMode: data.qualityMode,
        recentDesigns: await recentGenerationDesigns(user.id),
      });
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
        recentDesigns: await recentGenerationDesigns(user.id),
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
