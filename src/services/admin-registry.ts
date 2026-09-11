import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createLead } from "@/data/leads";
import type { BusinessResearchProfile } from "@/data/research";
import { siteConfigSchema, validateSiteConfig, type SiteConfig } from "@/data/site";
import { generationQualityModes } from "@/data/site-generation";
import type { ImageSelectionResult } from "@/data/visuals";
import { normalizeResearchProfile } from "@/services/business-research";

const cellSchema = z.string().trim().max(2_000);
const rowSchema = z
  .record(z.string().max(160), cellSchema)
  .refine((row) => Object.keys(row).length <= 80, "Too many columns in a row.");
const mappingSchema = z
  .record(z.string().max(80), z.string().max(160))
  .refine((mapping) => Object.keys(mapping).length <= 20, "Too many mapped columns.");
const accessSchema = z.object({ accessToken: z.string().min(1).max(8_192) });

function applyPexelsImages(config: SiteConfig, imageResult: ImageSelectionResult) {
  const selectedImages = Object.fromEntries(
    imageResult.assets.map((asset) => [asset.section, asset]),
  );
  return validateSiteConfig({
    ...config,
    seo: selectedImages["hero"]?.src
      ? { ...config.seo, socialImage: selectedImages["hero"].src }
      : config.seo,
    assets: {
      hero: selectedImages["hero"]?.src
        ? {
            ...config.assets.hero,
            src: selectedImages["hero"].src,
            alt: selectedImages["hero"].alt,
          }
        : config.assets.hero,
      about: selectedImages["about"]?.src
        ? {
            ...config.assets.about,
            src: selectedImages["about"].src,
            alt: selectedImages["about"].alt,
          }
        : config.assets.about,
      gallery: ["showcase-1", "showcase-2", "showcase-3"].map((section, index) => {
        const selected = selectedImages[section];
        const current = config.assets.gallery?.[index];
        return selected?.src
          ? { ...current, src: selected.src, alt: selected.alt }
          : (current ?? { alt: `${config.brand.name} featured work ${index + 1}` });
      }),
    },
    assetAttributions: imageResult.assets
      .filter((asset) => asset.originalSourceUrl)
      .map((asset) => ({
        label: asset.attribution ?? "Photo provided by Pexels",
        href: asset.originalSourceUrl!,
      })),
  });
}

function applyV3Images(config: SiteConfig, spec: NonNullable<SiteConfig["siteSpecV3"]>) {
  const [hero, about, ...gallery] = spec.media.assets;
  return validateSiteConfig({
    ...config,
    siteSpecV3: spec,
    seo: hero?.imageUrl ? { ...config.seo, socialImage: hero.imageUrl } : config.seo,
    assets: {
      hero: hero?.imageUrl
        ? { src: hero.imageUrl, alt: hero.alt, brief: hero.query }
        : config.assets.hero,
      about: about?.imageUrl
        ? { src: about.imageUrl, alt: about.alt, brief: about.query }
        : config.assets.about,
      gallery: gallery.slice(0, 4).map((asset) => ({
        ...(asset.imageUrl ? { src: asset.imageUrl } : {}),
        alt: asset.alt,
        brief: asset.query,
      })),
    },
    assetAttributions: spec.media.assets
      .filter((asset) => asset.sourceUrl && asset.attribution)
      .map((asset) => ({ label: asset.attribution!, href: asset.sourceUrl! })),
  });
}

const canonicalFields = [
  "businessName",
  "entityType",
  "registrationDate",
  "registrationStatus",
  "registeredAddress",
  "city",
  "state",
  "zipCode",
  "ownerOrAgent",
  "industry",
  "websiteUrl",
] as const;

type CanonicalField = (typeof canonicalFields)[number];
type RegistryRow = Record<string, string>;
type ColumnMapping = Partial<Record<CanonicalField, string>>;

function respond(status: number, error: string): never {
  throw new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function administrator(accessToken: string) {
  const { requireAdministrator } = await import("./admin-access");
  return requireAdministrator(accessToken);
}

function value(row: RegistryRow, mapping: ColumnMapping, field: CanonicalField) {
  const header = mapping[field];
  return header ? row[header]?.trim() || undefined : undefined;
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

function scoreBusiness(input: {
  name: string;
  industry?: string | undefined;
  entityType?: string | undefined;
  registrationStatus?: string | undefined;
  registrationDate?: string | undefined;
  websiteUrl?: string | undefined;
  targetIndustry: string;
}) {
  const reasons: Array<{ kind: "confirmed" | "estimate"; points: number; text: string }> = [];
  const searchable =
    `${input.name} ${input.industry ?? ""} ${input.entityType ?? ""}`.toLowerCase();
  const target = input.targetIndustry.toLowerCase();
  const roofingMatch = target.includes("roof") && /roof|roofer|roofing/.test(searchable);
  let score = 0;

  if (roofingMatch) {
    score += 45;
    reasons.push({ kind: "confirmed", points: 45, text: "Registry information matches roofing." });
  } else if (target && searchable.includes(target)) {
    score += 35;
    reasons.push({
      kind: "confirmed",
      points: 35,
      text: `Registry information matches ${input.targetIndustry}.`,
    });
  } else {
    reasons.push({
      kind: "estimate",
      points: 0,
      text: "Industry match was not confirmed by the registry.",
    });
  }

  if (
    /active|current|good standing|approved/.test((input.registrationStatus ?? "").toLowerCase())
  ) {
    score += 15;
    reasons.push({
      kind: "confirmed",
      points: 15,
      text: "Registry status is active or in good standing.",
    });
  }

  if (input.registrationDate) {
    const ageDays = (Date.now() - new Date(input.registrationDate).getTime()) / 86_400_000;
    if (ageDays >= 0 && ageDays <= 365) {
      score += 20;
      reasons.push({
        kind: "confirmed",
        points: 20,
        text: "Business was registered within the last year.",
      });
    } else if (ageDays >= 0 && ageDays <= 730) {
      score += 10;
      reasons.push({
        kind: "confirmed",
        points: 10,
        text: "Business was registered within the last two years.",
      });
    }
  }

  if (!input.websiteUrl) {
    score += 15;
    reasons.push({
      kind: "confirmed",
      points: 15,
      text: "No website URL was supplied in the registry.",
    });
  } else {
    reasons.push({
      kind: "confirmed",
      points: 0,
      text: "A website URL was supplied; live quality is not assumed.",
    });
  }

  if (!input.industry) {
    score += 5;
    reasons.push({
      kind: "estimate",
      points: 5,
      text: "Industry is incomplete, so live research may uncover a stronger fit.",
    });
  }

  return { score: Math.min(100, score), reasons };
}

async function dedupeKey(parts: Array<string | undefined>) {
  const normalized = parts
    .map((part) => (part ?? "").toLowerCase().replace(/[^a-z0-9]/g, ""))
    .join("|");
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(normalized).digest("hex");
}

async function verifyRegistryOwner(registryId: string, userId: string) {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
  const client = createSupabaseAdminClient();
  const { data: registry, error } = await client
    .from("business_registries")
    .select("id, target_industry")
    .eq("id", registryId)
    .eq("created_by", userId)
    .maybeSingle();
  if (error) throw new Error("Unable to verify this registry.");
  if (!registry) respond(404, "This registry is unavailable.");
  return { client, registry };
}

export const createRegistryImport = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    accessSchema
      .extend({
        sourceName: z.string().trim().min(1).max(255),
        targetIndustry: z.string().trim().min(1).max(160),
        headers: z.array(z.string().trim().min(1).max(160)).min(1).max(80),
        columnMapping: mappingSchema,
        rowCount: z.number().int().min(1).max(100_000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
    const { data: registry, error } = await createSupabaseAdminClient()
      .from("business_registries")
      .insert({
        created_by: user.id,
        source_name: data.sourceName,
        target_industry: data.targetIndustry,
        source_headers: data.headers,
        column_mapping: data.columnMapping,
        row_count: data.rowCount,
      })
      .select("id")
      .single();
    if (error || !registry) throw new Error("Unable to create the registry import.");
    return registry;
  });

export const importRegistryBatch = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    accessSchema
      .extend({
        registryId: z.string().uuid(),
        columnMapping: mappingSchema,
        rows: z.array(rowSchema).min(1).max(250),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const mapping = data.columnMapping as ColumnMapping;
    const records = [] as Array<Record<string, unknown>>;

    for (const row of data.rows) {
      const name = value(row, mapping, "businessName");
      if (!name) continue;
      const entityType = value(row, mapping, "entityType");
      const registrationStatus = value(row, mapping, "registrationStatus");
      const industry = value(row, mapping, "industry");
      const websiteUrl = value(row, mapping, "websiteUrl");
      const registeredAddress = value(row, mapping, "registeredAddress");
      const city = value(row, mapping, "city");
      const state = value(row, mapping, "state");
      const zipCode = value(row, mapping, "zipCode");
      const registrationDate = parseDate(value(row, mapping, "registrationDate"));
      const scored = scoreBusiness({
        name,
        industry,
        entityType,
        registrationStatus,
        registrationDate,
        websiteUrl,
        targetIndustry: registry.target_industry,
      });
      records.push({
        registry_id: registry.id,
        dedupe_key: await dedupeKey([
          name,
          registeredAddress,
          city,
          state,
          zipCode,
          registrationDate,
        ]),
        name,
        entity_type: entityType ?? null,
        registration_date: registrationDate ?? null,
        registration_status: registrationStatus ?? null,
        registered_address: registeredAddress ?? null,
        city: city ?? null,
        state: state ?? null,
        zip_code: zipCode ?? null,
        owner_or_agent: value(row, mapping, "ownerOrAgent") ?? null,
        industry: industry ?? null,
        website_url: websiteUrl ?? null,
        raw_row: row,
        preliminary_score: scored.score,
        preliminary_reasons: scored.reasons,
      });
    }

    if (records.length === 0) return { imported: 0, skipped: data.rows.length };
    const { error: insertError } = await client
      .from("registry_businesses")
      .upsert(records, { onConflict: "dedupe_key", ignoreDuplicates: true });
    if (insertError) throw new Error("Unable to import this batch.");

    const keys = records.map((record) => record["dedupe_key"] as string);
    const { data: businesses, error: lookupError } = await client
      .from("registry_businesses")
      .select("id")
      .in("dedupe_key", keys);
    if (lookupError) throw new Error("Unable to prepare imported businesses for review.");
    const { error: candidateError } = await client.from("registry_candidates").upsert(
      (businesses ?? []).map((business) => ({ registry_business_id: business.id })),
      {
        onConflict: "registry_business_id",
        ignoreDuplicates: true,
      },
    );
    if (candidateError) throw new Error("Unable to prepare imported businesses for review.");
    return { imported: records.length, skipped: data.rows.length - records.length };
  });

export const completeRegistryImport = createServerFn({ method: "POST" })
  .validator((data: unknown) => accessSchema.extend({ registryId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { count, error: countError } = await client
      .from("registry_businesses")
      .select("id", { count: "exact", head: true })
      .eq("registry_id", registry.id);
    if (countError) throw new Error("Unable to count imported businesses.");
    const { error } = await client
      .from("business_registries")
      .update({
        status: "complete",
        imported_count: count ?? 0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", registry.id)
      .eq("created_by", user.id);
    if (error) throw new Error("Unable to finalize the registry import.");
    return { importedCount: count ?? 0 };
  });

export const listRegistryCandidates = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    accessSchema
      .extend({
        registryId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(50),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: candidates, error } = await client
      .from("registry_candidates")
      .select(
        "id, review_status, research_result, research_source_count, research_attempts, last_research_error, demo_requested_at, prospect_demos(id, preview_token, status, prospect_outreach_drafts(id, recipient_email, subject, body, status, prospect_outreach_tracking(id, stage, notes, last_contacted_at, replied_at)), prospect_sms_drafts(id, recipient_phone, body, stage, notes, last_contacted_at, replied_at, phone_source_url, phone_confidence, consent_status, consent_source, consent_recorded_at, prospect_sms_events(id, event_type, details, created_at)), registry_businesses!inner(id, name, entity_type, registration_date, registration_status, registered_address, city, state, zip_code, owner_or_agent, industry, website_url, preliminary_score, preliminary_reasons, registry_id)",
      )
      .eq("registry_businesses.registry_id", registry.id)
      .order("preliminary_score", { referencedTable: "registry_businesses", ascending: false })
      .limit(data.limit);
    if (error) throw new Error("Unable to load the registry shortlist.");
    return candidates ?? [];
  });

export const queueCandidateAction = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    accessSchema
      .extend({
        registryId: z.string().uuid(),
        candidateIds: z.array(z.string().uuid()).min(1).max(50),
        action: z.enum(["research", "demo"]),
        qualityMode: z.enum(generationQualityModes).default("efficient"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: matching, error: lookupError } = await client
      .from("registry_candidates")
      .select("id, review_status, registry_businesses!inner(registry_id)")
      .in("id", data.candidateIds)
      .eq("registry_businesses.registry_id", registry.id);
    if (lookupError) throw new Error("Unable to verify selected businesses.");
    const ids = (matching ?? []).map((candidate) => candidate.id);
    if (ids.length !== data.candidateIds.length)
      respond(404, "One or more selected businesses are unavailable.");
    if (
      data.action === "demo" &&
      (matching ?? []).some((candidate) => candidate.review_status !== "research_complete")
    ) {
      respond(409, "Only research-complete businesses can be approved for a private demo.");
    }
    const update =
      data.action === "research"
        ? { review_status: "research_queued" }
        : { review_status: "demo_queued", demo_requested_at: new Date().toISOString() };
    const { error } = await client.from("registry_candidates").update(update).in("id", ids);
    if (error) throw new Error("Unable to queue the selected businesses.");
    const { error: jobError } = await client.from("registry_processing_jobs").insert({
      registry_id: registry.id,
      created_by: user.id,
      job_type: data.action === "research" ? "research" : "demo_generation",
      payload: {
        candidateIds: ids,
        ...(data.action === "demo" ? { qualityMode: data.qualityMode } : {}),
      },
    });
    if (jobError) throw new Error("Unable to create the processing job.");
    return { queued: ids.length };
  });

/** Processes a deliberately small, manually started research batch. */
export const processQueuedRegistryResearch = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    accessSchema
      .extend({
        registryId: z.string().uuid(),
        batchSize: z.number().int().min(1).max(5).default(5),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: claimed, error: claimError } = await client.rpc("claim_next_registry_job", {
      p_owner_id: user.id,
      p_job_type: "research",
      p_lock_seconds: 600,
    });
    if (claimError) throw new Error("Unable to claim a research job.");
    const job = (Array.isArray(claimed) ? claimed[0] : claimed) as {
      id: string;
      payload: { candidateIds?: unknown };
    } | null;
    if (!job) return { completed: 0, failed: 0, processed: 0 };
    const candidateIds = z
      .array(z.string().uuid())
      .min(1)
      .max(50)
      .safeParse(job.payload.candidateIds);
    if (!candidateIds.success) {
      await client
        .from("registry_processing_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          last_error: "Invalid job payload.",
        })
        .eq("id", job.id);
      throw new Error("The claimed research job has an invalid payload.");
    }
    const processingIds = candidateIds.data.slice(0, data.batchSize);
    const remainingIds = candidateIds.data.slice(data.batchSize);
    const { data: queued, error } = await client
      .from("registry_candidates")
      .select(
        "id, research_attempts, registry_businesses!inner(name, city, state, website_url, registry_id)",
      )
      .in("id", processingIds)
      .eq("review_status", "research_queued")
      .eq("registry_businesses.registry_id", registry.id)
      .limit(data.batchSize);
    if (error) throw new Error("Unable to load queued research.");

    let completed = 0;
    let failed = 0;
    for (const candidate of queued ?? []) {
      const business = candidate.registry_businesses as unknown as {
        name: string;
        city: string | null;
        state: string | null;
        website_url: string | null;
      };
      await client
        .from("registry_candidates")
        .update({ review_status: "researching", last_research_error: null })
        .eq("id", candidate.id);
      try {
        const { data: withinDailyBudget, error: budgetError } = await client.rpc(
          "consume_admin_provider_daily_budget",
          { p_owner_id: user.id, p_operation: "business_research", p_daily_limit: 50 },
        );
        if (budgetError || withinDailyBudget !== true)
          throw new Error("Daily research budget reached. Try again tomorrow.");
        const { data: withinQuota, error: quotaError } = await client.rpc(
          "consume_provider_operation_quota",
          { p_owner_id: user.id, p_operation: "business_research" },
        );
        if (quotaError || withinQuota !== true)
          throw new Error("Research quota reached. Try again later.");
        const { researchBusinessFromQuery } = await import("./research-business.server");
        const result = await researchBusinessFromQuery({
          businessName: business.name,
          city: business.city ?? undefined,
          state: business.state ?? undefined,
          websiteUrl: business.website_url ?? undefined,
          providerMode: "real",
        });
        const { error: updateError } = await client
          .from("registry_candidates")
          .update({
            review_status: "research_complete",
            research_result: result.profile,
            research_source_count: result.profile.sources.length,
            research_attempts: candidate.research_attempts + 1,
            last_research_error: null,
          })
          .eq("id", candidate.id);
        if (updateError) throw new Error("Unable to save the research result.");
        completed += 1;
      } catch (researchError) {
        await client
          .from("registry_candidates")
          .update({
            review_status: "research_failed",
            research_attempts: candidate.research_attempts + 1,
            last_research_error:
              researchError instanceof Error
                ? researchError.message.slice(0, 500)
                : "Research failed.",
          })
          .eq("id", candidate.id);
        failed += 1;
      }
    }
    const { error: finishError } = await client
      .from("registry_processing_jobs")
      .update({
        status: remainingIds.length > 0 ? "queued" : "completed",
        completed_at: remainingIds.length > 0 ? null : new Date().toISOString(),
        locked_until: null,
        payload: { candidateIds: remainingIds },
        result: {
          completed,
          failed,
          processed: (queued ?? []).length,
          remaining: remainingIds.length,
        },
      })
      .eq("id", job.id);
    if (finishError) throw new Error("Unable to finalize the research job.");
    return { completed, failed, processed: (queued ?? []).length };
  });

export const listRegistryProcessingJobs = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    accessSchema
      .extend({ registryId: z.string().uuid(), limit: z.number().int().min(1).max(25).default(10) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: jobs, error } = await client
      .from("registry_processing_jobs")
      .select("id, job_type, status, attempts, last_error, result, created_at, completed_at")
      .eq("registry_id", registry.id)
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error("Unable to load processing jobs.");
    return jobs ?? [];
  });

/** Generates one explicitly queued demo at a time, preserving the remaining queue. */
export const processNextProspectDemo = createServerFn({ method: "POST" })
  .validator((data: unknown) => accessSchema.extend({ registryId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: claimed, error: claimError } = await client.rpc("claim_next_registry_job", {
      p_owner_id: user.id,
      p_job_type: "demo_generation",
      p_lock_seconds: 600,
    });
    if (claimError) throw new Error("Unable to claim a demo job.");
    const job = (Array.isArray(claimed) ? claimed[0] : claimed) as {
      id: string;
      registry_id: string;
      payload: { candidateIds?: unknown; qualityMode?: unknown };
    } | null;
    if (!job) return { generated: 0, remaining: 0, previewToken: undefined };
    if (job.registry_id !== registry.id) {
      await client
        .from("registry_processing_jobs")
        .update({ status: "queued", locked_until: null })
        .eq("id", job.id);
      respond(
        409,
        "A queued demo belongs to a different registry. Select that registry before processing it.",
      );
    }
    const parsedIds = z.array(z.string().uuid()).min(1).max(50).safeParse(job.payload.candidateIds);
    if (!parsedIds.success) throw new Error("The claimed demo job has an invalid payload.");
    const candidateId = parsedIds.data[0]!;
    const remainingIds = parsedIds.data.slice(1);
    const qualityMode = z
      .enum(generationQualityModes)
      .catch("efficient")
      .parse(job.payload.qualityMode);
    const { data: candidate, error: candidateError } = await client
      .from("registry_candidates")
      .select(
        "id, research_result, registry_businesses!inner(name, city, state, industry, website_url, registration_date, registry_id)",
      )
      .eq("id", candidateId)
      .eq("review_status", "demo_queued")
      .eq("registry_businesses.registry_id", registry.id)
      .maybeSingle();
    if (candidateError || !candidate) throw new Error("The queued prospect is unavailable.");
    const business = candidate.registry_businesses as unknown as {
      name: string;
      city: string | null;
      state: string | null;
      industry: string | null;
      website_url: string | null;
      registration_date: string | null;
    };
    try {
      const { data: dailyBudget, error: budgetError } = await client.rpc(
        "consume_admin_provider_daily_budget",
        { p_owner_id: user.id, p_operation: "ai_generation", p_daily_limit: 25 },
      );
      if (budgetError || dailyBudget !== true)
        throw new Error("Daily demo-generation budget reached. Try again tomorrow.");
      const { data: hourlyQuota, error: quotaError } = await client.rpc(
        "consume_provider_operation_quota",
        { p_owner_id: user.id, p_operation: "ai_generation" },
      );
      if (quotaError || hourlyQuota !== true)
        throw new Error("Demo-generation quota reached. Try again later.");
      const normalized = candidate.research_result
        ? normalizeResearchProfile(
            candidate.research_result as Parameters<typeof normalizeResearchProfile>[0],
          )
        : {};
      const lead = createLead({
        ...normalized,
        businessName: business.name,
        industry: normalized.industry ?? business.industry ?? undefined,
        city: normalized.city ?? business.city ?? undefined,
        state: normalized.state ?? business.state ?? undefined,
        website: normalized.website ?? business.website_url ?? undefined,
        source: "admin-registry-demo",
      });
      const { createAiSiteConfig } = await import("./generate-site-config-with-ai.server");
      let config: SiteConfig = await createAiSiteConfig(lead, {
        qualityMode,
        ...(candidate.research_result
          ? {
              researchProfile: candidate.research_result as Parameters<
                typeof normalizeResearchProfile
              >[0],
            }
          : {}),
      });
      let imagesSelected = 0;
      if (config.siteSpecV3) {
        const { sourceImagesForSiteSpecV3 } = await import("./source-images-for-site.server");
        const result = await sourceImagesForSiteSpecV3(config.siteSpecV3);
        config = applyV3Images(config, result.spec);
        imagesSelected = result.sourced;
      } else {
        const { sourceImagesForSite } = await import("./source-images-for-site.server");
        const briefs = Object.fromEntries(
          [
            ["hero", config.assets.hero.brief ?? config.assets.hero.alt],
            ["about", config.assets.about.brief ?? config.assets.about.alt],
            ["showcase-1", config.assets.gallery?.[0]?.brief],
            ["showcase-2", config.assets.gallery?.[1]?.brief],
            ["showcase-3", config.assets.gallery?.[2]?.brief],
          ].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        );
        const imageResult = await sourceImagesForSite({
          lead,
          style: config.design?.visualDirection ?? "professional",
          briefs,
        });
        config = applyPexelsImages(config, imageResult);
        imagesSelected = imageResult.assets.length;
      }
      const { data: demo, error: demoError } = await client
        .from("prospect_demos")
        .upsert(
          {
            registry_candidate_id: candidate.id,
            created_by: user.id,
            status: "ready",
            site_config: config,
            generated_at: new Date().toISOString(),
            last_error: null,
          },
          { onConflict: "registry_candidate_id" },
        )
        .select("id, preview_token")
        .single();
      if (demoError || !demo) throw new Error("Unable to save the private demo.");
      const { error: crmError } = await client
        .from("prospect_crm_records")
        .upsert(
          { prospect_demo_id: demo.id, created_by: user.id },
          { onConflict: "prospect_demo_id", ignoreDuplicates: true },
        );
      if (crmError) throw new Error("Unable to create the private-demo CRM record.");
      await client
        .from("registry_candidates")
        .update({ review_status: "demo_complete" })
        .eq("id", candidate.id);
      await client
        .from("registry_processing_jobs")
        .update({
          status: remainingIds.length ? "queued" : "completed",
          payload: { candidateIds: remainingIds },
          locked_until: null,
          completed_at: remainingIds.length ? null : new Date().toISOString(),
          result: {
            generated: 1,
            remaining: remainingIds.length,
            qualityMode,
            qualityScore: config.generation?.qualityScore,
            actualCostCents: config.generation?.actualCostCents,
            imagesSelected,
          },
        })
        .eq("id", job.id);
      return { generated: 1, remaining: remainingIds.length, previewToken: demo.preview_token };
    } catch (error) {
      await client
        .from("registry_candidates")
        .update({
          review_status: "research_complete",
          last_research_error:
            error instanceof Error ? error.message.slice(0, 500) : "Demo generation failed.",
        })
        .eq("id", candidate.id);
      await client
        .from("registry_processing_jobs")
        .update({
          status: "failed",
          locked_until: null,
          completed_at: new Date().toISOString(),
          last_error:
            error instanceof Error ? error.message.slice(0, 500) : "Demo generation failed.",
        })
        .eq("id", job.id);
      throw error;
    }
  });

/** Repairs or replaces the Pexels photography for one administrator-owned prospect demo. */
export const refreshProspectDemoImages = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    accessSchema
      .extend({ registryId: z.string().uuid(), candidateId: z.string().uuid() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: candidate, error: candidateError } = await client
      .from("registry_candidates")
      .select(
        "id, research_result, registry_businesses!inner(name, city, state, industry, website_url, registry_id)",
      )
      .eq("id", data.candidateId)
      .eq("registry_businesses.registry_id", registry.id)
      .maybeSingle();
    if (candidateError || !candidate) respond(404, "This prospect is unavailable.");
    const { data: demo, error: demoError } = await client
      .from("prospect_demos")
      .select("id, site_config")
      .eq("registry_candidate_id", candidate.id)
      .eq("created_by", user.id)
      .eq("status", "ready")
      .maybeSingle();
    if (demoError || !demo) respond(404, "This private demo is unavailable.");
    const currentConfig = siteConfigSchema.safeParse(demo.site_config);
    if (!currentConfig.success) throw new Error("This private demo has an invalid configuration.");

    const { data: dailyBudget, error: budgetError } = await client.rpc(
      "consume_admin_provider_daily_budget",
      { p_owner_id: user.id, p_operation: "image_sourcing", p_daily_limit: 100 },
    );
    if (budgetError || dailyBudget !== true)
      respond(429, "Daily image-sourcing budget reached. Try again tomorrow.");
    const { data: hourlyQuota, error: quotaError } = await client.rpc(
      "consume_provider_operation_quota",
      { p_owner_id: user.id, p_operation: "image_sourcing" },
    );
    if (quotaError || hourlyQuota !== true)
      respond(429, "Image-sourcing quota reached. Try again later.");

    const business = candidate.registry_businesses as unknown as {
      name: string;
      city: string | null;
      state: string | null;
      industry: string | null;
      website_url: string | null;
    };
    const normalized = candidate.research_result
      ? normalizeResearchProfile(
          candidate.research_result as Parameters<typeof normalizeResearchProfile>[0],
        )
      : {};
    const lead = createLead({
      ...normalized,
      businessName: business.name,
      industry: normalized.industry ?? business.industry ?? undefined,
      city: normalized.city ?? business.city ?? undefined,
      state: normalized.state ?? business.state ?? undefined,
      website: normalized.website ?? business.website_url ?? undefined,
      services: currentConfig.data.services.items.map((service) => service.title),
      businessDescription: currentConfig.data.about.body,
      source: "admin-registry-image-refresh",
    });
    let nextConfig: SiteConfig;
    let refreshed: number;
    if (currentConfig.data.siteSpecV3) {
      const { sourceImagesForSiteSpecV3 } = await import("./source-images-for-site.server");
      const result = await sourceImagesForSiteSpecV3(currentConfig.data.siteSpecV3);
      nextConfig = applyV3Images(validateSiteConfig(currentConfig.data), result.spec);
      refreshed = result.sourced;
    } else {
      const briefs = Object.fromEntries(
        [
          ["hero", currentConfig.data.assets.hero.brief ?? currentConfig.data.assets.hero.alt],
          ["about", currentConfig.data.assets.about.brief ?? currentConfig.data.assets.about.alt],
          ["showcase-1", currentConfig.data.assets.gallery?.[0]?.brief],
          ["showcase-2", currentConfig.data.assets.gallery?.[1]?.brief],
          ["showcase-3", currentConfig.data.assets.gallery?.[2]?.brief],
        ].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      );
      const { sourceImagesForSite } = await import("./source-images-for-site.server");
      const imageResult = await sourceImagesForSite({
        lead,
        style: currentConfig.data.design?.visualDirection ?? "professional",
        briefs,
      });
      nextConfig = applyPexelsImages(validateSiteConfig(currentConfig.data), imageResult);
      refreshed = imageResult.assets.length;
    }
    const { data: updated, error: updateError } = await client
      .from("prospect_demos")
      .update({ site_config: nextConfig, generated_at: new Date().toISOString(), last_error: null })
      .eq("id", demo.id)
      .eq("created_by", user.id)
      .select("id")
      .maybeSingle();
    if (updateError || !updated) throw new Error("Unable to save refreshed Pexels images.");
    return { refreshed };
  });

/** Public capability endpoint: only a hard-to-guess private preview token is accepted. */
export const getPrivateProspectDemo = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
    const { data: demo, error } = await createSupabaseAdminClient()
      .from("prospect_demos")
      .select("site_config, status, expires_at, claim_token, claim_expires_at, claimed_by")
      .eq("preview_token", data.token)
      .eq("status", "ready")
      .maybeSingle();
    if (error || !demo || (demo.expires_at && new Date(demo.expires_at) <= new Date()))
      return { config: null };
    const config = siteConfigSchema.safeParse(demo.site_config);
    if (!config.success) return { config: null };
    return {
      config: config.data,
      claimToken:
        !demo.claimed_by && (!demo.claim_expires_at || new Date(demo.claim_expires_at) > new Date())
          ? demo.claim_token
          : null,
    };
  });

function previewOrigin() {
  const configured = process.env["UPVERO_APP_URL"] || "https://upvero.org";
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("The private preview URL is not configured correctly.");
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("Private previews require an HTTPS application URL.");
  }
  return url.origin;
}

function outreachCopy(businessName: string, previewUrl: string) {
  return {
    subject: `A website preview for ${businessName}`,
    body: `Hi ${businessName} team,\n\nI put together a private website preview for your business based on publicly available information. You can view it here:\n${previewUrl}\n\nThere is no obligation. If it is useful, I would be glad to hear what you would change or improve.\n\nBest,\nUpvero`,
  };
}

const outreachDraftSchema = accessSchema.extend({
  registryId: z.string().uuid(),
  candidateId: z.string().uuid(),
});

/** Creates a copy-ready message only. This never sends email, SMS, or any outreach. */
export const prepareProspectOutreachDraft = createServerFn({ method: "POST" })
  .validator((data: unknown) => outreachDraftSchema.parse(data))
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: candidate, error: candidateError } = await client
      .from("registry_candidates")
      .select("id, registry_businesses!inner(name, registry_id)")
      .eq("id", data.candidateId)
      .eq("review_status", "demo_complete")
      .eq("registry_businesses.registry_id", registry.id)
      .maybeSingle();
    if (candidateError || !candidate) respond(404, "This completed demo is unavailable.");
    const { data: demo, error: demoError } = await client
      .from("prospect_demos")
      .select(
        "id, preview_token, prospect_outreach_drafts(id, recipient_email, subject, body, status)",
      )
      .eq("registry_candidate_id", candidate.id)
      .eq("created_by", user.id)
      .eq("status", "ready")
      .maybeSingle();
    if (demoError || !demo) respond(404, "This private demo is unavailable.");
    const existing = (demo.prospect_outreach_drafts ?? [])[0];
    if (existing) return existing;
    const business = candidate.registry_businesses as unknown as { name: string };
    const copy = outreachCopy(business.name, `${previewOrigin()}/demo/${demo.preview_token}`);
    const { data: draft, error: insertError } = await client
      .from("prospect_outreach_drafts")
      .insert({ prospect_demo_id: demo.id, created_by: user.id, ...copy })
      .select("id, recipient_email, subject, body, status")
      .single();
    if (insertError || !draft) throw new Error("Unable to prepare the outreach draft.");
    return draft;
  });

export const saveProspectOutreachDraft = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    outreachDraftSchema
      .extend({
        draftId: z.string().uuid(),
        recipientEmail: z.string().trim().email().max(320).optional(),
        subject: z.string().trim().min(1).max(240),
        body: z.string().trim().min(1).max(6_000),
        status: z.enum(["draft", "ready_to_copy", "dismissed"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: draft, error: lookupError } = await client
      .from("prospect_outreach_drafts")
      .select(
        "id, prospect_demos!inner(created_by, registry_candidates!inner(registry_businesses!inner(registry_id)))",
      )
      .eq("id", data.draftId)
      .eq("created_by", user.id)
      .eq("prospect_demos.created_by", user.id)
      .eq("prospect_demos.registry_candidates.registry_businesses.registry_id", registry.id)
      .maybeSingle();
    if (lookupError || !draft) respond(404, "This outreach draft is unavailable.");
    const { data: saved, error: updateError } = await client
      .from("prospect_outreach_drafts")
      .update({
        recipient_email: data.recipientEmail || null,
        subject: data.subject,
        body: data.body,
        status: data.status,
      })
      .eq("id", draft.id)
      .eq("created_by", user.id)
      .select("id, recipient_email, subject, body, status")
      .single();
    if (updateError || !saved) throw new Error("Unable to save the outreach draft.");
    return saved;
  });

const outreachStageSchema = z.enum([
  "ready",
  "contacted",
  "replied",
  "meeting",
  "won",
  "lost",
  "do_not_contact",
]);

const manualSmsStageSchema = z.enum(["ready", "contacted", "replied", "meeting", "won", "lost"]);

function normalizeUsPhone(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  respond(400, "Enter a valid U.S. phone number, including its area code.");
}

function normalizePublicResearchPhone(value: string | undefined) {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15)
    return `+${digits}`;
  return undefined;
}

function verifiedResearchPhone(profile: unknown) {
  const phone = (profile as Partial<BusinessResearchProfile> | null)?.phone;
  if (!phone || typeof phone.value !== "string" || !["high", "medium"].includes(phone.confidence)) {
    return undefined;
  }
  const source = phone.sources.find((item) => !item.isMock && Boolean(item.sourceUrl));
  const normalized = normalizePublicResearchPhone(phone.value);
  if (!source || !normalized) return undefined;
  return {
    phone: phone.value,
    normalized,
    confidence: phone.confidence,
    sourceUrl: source.sourceUrl!,
  };
}

async function recordSmsEvent(
  client: Awaited<
    ReturnType<(typeof import("@/lib/supabase/server"))["createSupabaseAdminClient"]>
  >,
  draftId: string,
  userId: string,
  eventType:
    | "draft_prepared"
    | "draft_saved"
    | "copied_for_manual_send"
    | "consent_recorded"
    | "marked_do_not_contact",
  details: Record<string, string> = {},
) {
  const { error } = await client.from("prospect_sms_events").insert({
    prospect_sms_draft_id: draftId,
    created_by: userId,
    event_type: eventType,
    details,
  });
  if (error) throw new Error("Unable to record SMS activity.");
}

function manualSmsCopy(businessName: string, previewUrl: string) {
  return `Hi ${businessName} team — I’m with Upvero. I made a private website preview for your business based on publicly available information: ${previewUrl}\n\nThere is no obligation. Reply STOP if you do not want future texts.`;
}

const smsDraftSchema = accessSchema.extend({
  registryId: z.string().uuid(),
  candidateId: z.string().uuid(),
});

/** Creates a copy-ready SMS only. It never contacts a phone number. */
export const prepareProspectSmsDraft = createServerFn({ method: "POST" })
  .validator((data: unknown) => smsDraftSchema.parse(data))
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: candidate, error: candidateError } = await client
      .from("registry_candidates")
      .select("id, research_result, registry_businesses!inner(name, registry_id)")
      .eq("id", data.candidateId)
      .eq("review_status", "demo_complete")
      .eq("registry_businesses.registry_id", registry.id)
      .maybeSingle();
    if (candidateError || !candidate) respond(404, "This completed demo is unavailable.");
    const { data: demo, error: demoError } = await client
      .from("prospect_demos")
      .select(
        "id, preview_token, prospect_sms_drafts(id, recipient_phone, body, stage, notes, last_contacted_at, replied_at, phone_source_url, phone_confidence, consent_status, consent_source, consent_recorded_at, prospect_sms_events(id, event_type, details, created_at))",
      )
      .eq("registry_candidate_id", candidate.id)
      .eq("created_by", user.id)
      .eq("status", "ready")
      .maybeSingle();
    if (demoError || !demo) respond(404, "This private demo is unavailable.");
    const existing = (demo.prospect_sms_drafts ?? [])[0];
    if (existing) return existing;
    const business = candidate.registry_businesses as unknown as { name: string };
    const evidence = verifiedResearchPhone(
      (candidate as { research_result?: unknown }).research_result,
    );
    if (evidence) {
      const { data: suppression, error: suppressionError } = await client
        .from("prospect_sms_suppressions")
        .select("recipient_phone_normalized")
        .eq("recipient_phone_normalized", evidence.normalized)
        .maybeSingle();
      if (suppressionError) throw new Error("Unable to verify this research phone number.");
      if (suppression)
        respond(409, "The verified public number is permanently marked do-not-contact.");
    }
    const { data: draft, error: insertError } = await client
      .from("prospect_sms_drafts")
      .insert({
        prospect_demo_id: demo.id,
        created_by: user.id,
        recipient_phone: evidence?.phone ?? null,
        recipient_phone_normalized: evidence?.normalized ?? null,
        phone_source_url: evidence?.sourceUrl ?? null,
        phone_confidence: evidence?.confidence ?? "unverified",
        body: manualSmsCopy(business.name, `${previewOrigin()}/demo/${demo.preview_token}`),
      })
      .select(
        "id, recipient_phone, body, stage, notes, last_contacted_at, replied_at, phone_source_url, phone_confidence, consent_status, consent_source, consent_recorded_at, prospect_sms_events(id, event_type, details, created_at)",
      )
      .single();
    if (insertError || !draft) throw new Error("Unable to prepare the SMS draft.");
    await recordSmsEvent(client, draft.id, user.id, "draft_prepared", {
      phoneSource: evidence?.sourceUrl ?? "",
      phoneConfidence: evidence?.confidence ?? "unverified",
    });
    return draft;
  });

export const saveProspectSmsDraft = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    smsDraftSchema
      .extend({
        draftId: z.string().uuid(),
        recipientPhone: z.string().trim().max(40).optional(),
        body: z.string().trim().min(1).max(1_600),
        stage: manualSmsStageSchema,
        notes: z.string().trim().max(2_000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: draft, error: lookupError } = await client
      .from("prospect_sms_drafts")
      .select(
        "id, recipient_phone_normalized, phone_source_url, phone_confidence, prospect_demos!inner(created_by, registry_candidates!inner(registry_businesses!inner(registry_id)))",
      )
      .eq("id", data.draftId)
      .eq("created_by", user.id)
      .eq("prospect_demos.created_by", user.id)
      .eq("prospect_demos.registry_candidates.registry_businesses.registry_id", registry.id)
      .maybeSingle();
    if (lookupError || !draft) respond(404, "This SMS draft is unavailable.");
    const normalizedPhone = normalizeUsPhone(data.recipientPhone);
    if (normalizedPhone) {
      const { data: suppression, error: suppressionError } = await client
        .from("prospect_sms_suppressions")
        .select("recipient_phone_normalized")
        .eq("recipient_phone_normalized", normalizedPhone)
        .maybeSingle();
      if (suppressionError) throw new Error("Unable to verify this phone number.");
      if (suppression) respond(409, "This phone number is permanently marked do-not-contact.");
    }
    const timestamp = new Date().toISOString();
    const phoneChanged = normalizedPhone !== draft.recipient_phone_normalized;
    const { data: saved, error: updateError } = await client
      .from("prospect_sms_drafts")
      .update({
        recipient_phone: data.recipientPhone || null,
        recipient_phone_normalized: normalizedPhone,
        ...(phoneChanged ? { phone_source_url: null, phone_confidence: "unverified" } : {}),
        body: data.body,
        stage: data.stage,
        notes: data.notes,
        ...(data.stage === "contacted" ? { last_contacted_at: timestamp } : {}),
        ...(data.stage === "replied" ? { replied_at: timestamp } : {}),
      })
      .eq("id", draft.id)
      .eq("created_by", user.id)
      .select(
        "id, recipient_phone, body, stage, notes, last_contacted_at, replied_at, phone_source_url, phone_confidence, consent_status, consent_source, consent_recorded_at, prospect_sms_events(id, event_type, details, created_at)",
      )
      .single();
    if (updateError || !saved) throw new Error("Unable to save the SMS draft.");
    await recordSmsEvent(client, saved.id, user.id, "draft_saved", { stage: data.stage });
    return saved;
  });

/** Permanently suppresses a manually reviewed SMS recipient. It never sends a reply. */
export const markProspectSmsDoNotContact = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    smsDraftSchema
      .extend({ draftId: z.string().uuid(), reason: z.string().trim().min(1).max(500) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: draft, error: lookupError } = await client
      .from("prospect_sms_drafts")
      .select(
        "id, recipient_phone_normalized, prospect_demos!inner(created_by, registry_candidates!inner(registry_businesses!inner(registry_id)))",
      )
      .eq("id", data.draftId)
      .eq("created_by", user.id)
      .eq("prospect_demos.created_by", user.id)
      .eq("prospect_demos.registry_candidates.registry_businesses.registry_id", registry.id)
      .maybeSingle();
    if (lookupError || !draft) respond(404, "This SMS draft is unavailable.");
    if (!draft.recipient_phone_normalized)
      respond(400, "Save a valid phone number before marking it do-not-contact.");
    const { error: suppressionError } = await client.from("prospect_sms_suppressions").upsert(
      {
        recipient_phone_normalized: draft.recipient_phone_normalized,
        created_by: user.id,
        source_draft_id: draft.id,
        reason: data.reason,
      },
      { onConflict: "recipient_phone_normalized", ignoreDuplicates: true },
    );
    if (suppressionError) throw new Error("Unable to save the do-not-contact preference.");
    const { data: saved, error: updateError } = await client
      .from("prospect_sms_drafts")
      .update({ stage: "do_not_contact" })
      .eq("id", draft.id)
      .eq("created_by", user.id)
      .select(
        "id, recipient_phone, body, stage, notes, last_contacted_at, replied_at, phone_source_url, phone_confidence, consent_status, consent_source, consent_recorded_at, prospect_sms_events(id, event_type, details, created_at)",
      )
      .single();
    if (updateError || !saved) throw new Error("Unable to update this SMS draft.");
    await recordSmsEvent(client, saved.id, user.id, "marked_do_not_contact", {
      reason: data.reason,
    });
    return saved;
  });

/** Records that an administrator manually copied a text. No telecom provider is called. */
export const recordProspectSmsCopy = createServerFn({ method: "POST" })
  .validator((data: unknown) => smsDraftSchema.extend({ draftId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: draft, error } = await client
      .from("prospect_sms_drafts")
      .select(
        "id, recipient_phone_normalized, stage, consent_status, prospect_demos!inner(created_by, registry_candidates!inner(registry_businesses!inner(registry_id)))",
      )
      .eq("id", data.draftId)
      .eq("created_by", user.id)
      .eq("prospect_demos.created_by", user.id)
      .eq("prospect_demos.registry_candidates.registry_businesses.registry_id", registry.id)
      .maybeSingle();
    if (error || !draft) respond(404, "This SMS draft is unavailable.");
    if (draft.stage === "do_not_contact")
      respond(409, "This phone number is marked do-not-contact.");
    if (!draft.recipient_phone_normalized)
      respond(400, "Save a valid phone number before copying this text.");
    if (draft.consent_status !== "opted_in")
      respond(403, "Record the recipient's explicit opt-in before preparing a text for delivery.");
    await recordSmsEvent(client, draft.id, user.id, "copied_for_manual_send");
    return { recorded: true };
  });

/** Records direct opt-in evidence only; this does not turn on sending or delivery. */
export const recordProspectSmsConsent = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    smsDraftSchema
      .extend({ draftId: z.string().uuid(), consentSource: z.string().trim().min(3).max(500) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: draft, error } = await client
      .from("prospect_sms_drafts")
      .select(
        "id, recipient_phone_normalized, stage, prospect_demos!inner(created_by, registry_candidates!inner(registry_businesses!inner(registry_id)))",
      )
      .eq("id", data.draftId)
      .eq("created_by", user.id)
      .eq("prospect_demos.created_by", user.id)
      .eq("prospect_demos.registry_candidates.registry_businesses.registry_id", registry.id)
      .maybeSingle();
    if (error || !draft) respond(404, "This SMS draft is unavailable.");
    if (draft.stage === "do_not_contact")
      respond(409, "This phone number is marked do-not-contact.");
    if (!draft.recipient_phone_normalized)
      respond(400, "Save a valid phone number before recording consent.");
    const timestamp = new Date().toISOString();
    const { data: saved, error: updateError } = await client
      .from("prospect_sms_drafts")
      .update({
        consent_status: "opted_in",
        consent_source: data.consentSource,
        consent_recorded_at: timestamp,
      })
      .eq("id", draft.id)
      .eq("created_by", user.id)
      .select(
        "id, recipient_phone, body, stage, notes, last_contacted_at, replied_at, phone_source_url, phone_confidence, consent_status, consent_source, consent_recorded_at, prospect_sms_events(id, event_type, details, created_at)",
      )
      .single();
    if (updateError || !saved) throw new Error("Unable to record SMS consent.");
    await recordSmsEvent(client, saved.id, user.id, "consent_recorded", {
      source: data.consentSource,
    });
    return saved;
  });

/** Records a manual sales outcome only; no provider or delivery API is invoked. */
export const saveProspectOutreachTracking = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    accessSchema
      .extend({
        registryId: z.string().uuid(),
        draftId: z.string().uuid(),
        stage: outreachStageSchema,
        notes: z.string().trim().max(2_000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const { data: draft, error: lookupError } = await client
      .from("prospect_outreach_drafts")
      .select(
        "id, prospect_demos!inner(created_by, registry_candidates!inner(registry_businesses!inner(registry_id)))",
      )
      .eq("id", data.draftId)
      .eq("created_by", user.id)
      .eq("prospect_demos.created_by", user.id)
      .eq("prospect_demos.registry_candidates.registry_businesses.registry_id", registry.id)
      .maybeSingle();
    if (lookupError || !draft) respond(404, "This outreach draft is unavailable.");
    const timestamp = new Date().toISOString();
    const update = {
      outreach_draft_id: draft.id,
      created_by: user.id,
      stage: data.stage,
      notes: data.notes,
      ...(data.stage === "contacted" ? { last_contacted_at: timestamp } : {}),
      ...(data.stage === "replied" ? { replied_at: timestamp } : {}),
    };
    const { data: tracking, error: trackingError } = await client
      .from("prospect_outreach_tracking")
      .upsert(update, { onConflict: "outreach_draft_id" })
      .select("id, stage, notes, last_contacted_at, replied_at")
      .single();
    if (trackingError || !tracking) throw new Error("Unable to save the outreach tracking update.");
    return tracking;
  });

export const getRegistryPipelineSummary = createServerFn({ method: "POST" })
  .validator((data: unknown) => accessSchema.extend({ registryId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { user } = await administrator(data.accessToken);
    const { client, registry } = await verifyRegistryOwner(data.registryId, user.id);
    const candidateStatuses = [
      "review",
      "research_queued",
      "researching",
      "research_complete",
      "research_failed",
      "demo_queued",
      "demo_complete",
      "dismissed",
    ] as const;
    const outreachStages = [
      "ready",
      "contacted",
      "replied",
      "meeting",
      "won",
      "lost",
      "do_not_contact",
    ] as const;
    const candidateCounts = await Promise.all(
      candidateStatuses.map(async (status) => {
        const { count, error } = await client
          .from("registry_candidates")
          .select("id, registry_businesses!inner(registry_id)", { count: "exact", head: true })
          .eq("registry_businesses.registry_id", registry.id)
          .eq("review_status", status);
        if (error) throw new Error("Unable to summarize registry candidates.");
        return [status, count ?? 0] as const;
      }),
    );
    const outreachCounts = await Promise.all(
      outreachStages.map(async (stage) => {
        const { count, error } = await client
          .from("prospect_outreach_tracking")
          .select(
            "id, prospect_outreach_drafts!inner(prospect_demos!inner(registry_candidates!inner(registry_businesses!inner(registry_id))))",
            { count: "exact", head: true },
          )
          .eq(
            "prospect_outreach_drafts.prospect_demos.registry_candidates.registry_businesses.registry_id",
            registry.id,
          )
          .eq("stage", stage);
        if (error) throw new Error("Unable to summarize manual outreach.");
        return [stage, count ?? 0] as const;
      }),
    );
    const smsCounts = await Promise.all(
      outreachStages.map(async (stage) => {
        const { count, error } = await client
          .from("prospect_sms_drafts")
          .select(
            "id, prospect_demos!inner(registry_candidates!inner(registry_businesses!inner(registry_id)))",
            { count: "exact", head: true },
          )
          .eq("prospect_demos.registry_candidates.registry_businesses.registry_id", registry.id)
          .eq("stage", stage);
        if (error) throw new Error("Unable to summarize manual SMS drafts.");
        return [stage, count ?? 0] as const;
      }),
    );
    const { count: copiedCount, error: copiedError } = await client
      .from("prospect_sms_events")
      .select(
        "id, prospect_sms_drafts!inner(prospect_demos!inner(registry_candidates!inner(registry_businesses!inner(registry_id))))",
        { count: "exact", head: true },
      )
      .eq(
        "prospect_sms_drafts.prospect_demos.registry_candidates.registry_businesses.registry_id",
        registry.id,
      )
      .eq("event_type", "copied_for_manual_send");
    if (copiedError) throw new Error("Unable to summarize manual text activity.");
    return {
      candidates: Object.fromEntries(candidateCounts),
      outreach: Object.fromEntries(outreachCounts),
      sms: Object.fromEntries(smsCounts),
      smsCopied: copiedCount ?? 0,
    };
  });
