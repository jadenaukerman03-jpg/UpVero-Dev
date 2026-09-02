import type {
  BusinessResearchProfile,
  ResearchConfidence,
  ResearchFieldEvidence,
  ResearchFieldName,
  ResearchFinding,
  ResearchJobResult,
  ResearchProviderKind,
  ResearchQuery,
} from "@/data/research";

import type { LeadInput } from "@/data/leads";

/** A provider can be implemented with a registry, search, maps, or website API later. */
export interface BusinessResearchProvider {
  kind: ResearchProviderKind;
  label: string;
  isConfigured: boolean;
  research(query: ResearchQuery): Promise<ResearchFinding[]>;
}

/**
 * Development-only provider. It deliberately returns only the submitted query,
 * never invented business details, and is visibly marked as mock data.
 */
export const mockResearchProvider: BusinessResearchProvider = {
  kind: "mock",
  label: "Development/mock provider",
  isConfigured: true,
  async research(query) {
    const fields: ResearchFinding["fields"] = { businessName: query.businessName };
    if (query.websiteUrl) fields.websiteUrl = query.websiteUrl;

    return [
      {
        source: "mock",
        sourceUrl: query.websiteUrl || undefined,
        timestamp: new Date().toISOString(),
        rawFindings:
          "Development/mock result. This provider only preserves submitted research query values; it does not perform real public-data research.",
        confidence: "low",
        fields,
        isMock: true,
      },
    ];
  },
};

function confidenceRank(confidence: ResearchConfidence): number {
  return { high: 3, medium: 2, low: 1, unavailable: 0 }[confidence];
}

function evidenceFor(
  field: ResearchFieldName,
  findings: ResearchFinding[],
): ResearchFieldEvidence | undefined {
  const candidates = findings.filter((finding) => finding.fields[field] !== undefined);
  if (candidates.length === 0) return undefined;
  const selected = candidates.reduce((best, candidate) =>
    confidenceRank(candidate.confidence) > confidenceRank(best.confidence) ? candidate : best,
  );
  const value = selected.fields[field];
  if (value === undefined) return undefined;
  return { value, confidence: selected.confidence, sources: candidates };
}

function createProfile(query: ResearchQuery, findings: ResearchFinding[]): BusinessResearchProfile {
  const fields: ResearchFieldName[] = [
    "businessName",
    "industry",
    "phone",
    "email",
    "address",
    "serviceAreas",
    "services",
    "businessDescription",
    "websiteUrl",
    "socialProfiles",
    "registrationDate",
    "entityType",
  ];
  const collected = Object.fromEntries(
    fields.map((field) => [field, evidenceFor(field, findings)]),
  ) as Partial<Record<ResearchFieldName, ResearchFieldEvidence | undefined>>;
  const available = Object.values(collected).filter(Boolean).length;

  return {
    ...collected,
    sources: findings,
    completeness: Math.round((available / fields.length) * 100),
    additionalNotes: [
      findings.every((finding) => finding.isMock)
        ? "Research completed with the development/mock provider only."
        : `Real public-web research completed with ${findings.length} source${findings.length === 1 ? "" : "s"}.`,
      "Verify every field with its cited public source before publishing or contacting a business.",
      query.city || query.state ? `Research query location: ${[query.city, query.state].filter(Boolean).join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function textValue(evidence: ResearchFieldEvidence | undefined): string | undefined {
  return typeof evidence?.value === "string" ? evidence.value : undefined;
}

function listValue(evidence: ResearchFieldEvidence | undefined): string[] | undefined {
  return Array.isArray(evidence?.value) ? evidence.value : undefined;
}

/**
 * Source-preserving normalizer boundary. Replace this implementation with a
 * server-side OpenAI normalizer later; callers continue receiving LeadInput.
 */
export function normalizeResearchProfile(profile: BusinessResearchProfile): LeadInput {
  return {
    businessName: textValue(profile.businessName),
    industry: textValue(profile.industry),
    phone: textValue(profile.phone),
    email: textValue(profile.email),
    address: textValue(profile.address),
    website: textValue(profile.websiteUrl),
    serviceAreas: listValue(profile.serviceAreas),
    services: listValue(profile.services),
    businessDescription: textValue(profile.businessDescription),
    notes: profile.additionalNotes,
    source: profile.sources.every((finding) => finding.isMock)
      ? "development/mock research"
      : "OpenAI web-search research",
  };
}

export async function researchBusiness(
  query: ResearchQuery,
  providers: BusinessResearchProvider[] = [mockResearchProvider],
): Promise<ResearchJobResult> {
  const settled = await Promise.allSettled(providers.map((provider) => provider.research(query)));
  const failures = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failures.length > 0) {
    console.error("Research provider failure", failures.map((failure) => failure.reason));
    throw new Error("Research provider error: the enabled provider could not complete the request.");
  }
  const findings = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const profile = createProfile(query, findings);

  return {
    jobId: crypto.randomUUID(),
    query,
    profile,
    normalizedLead: normalizeResearchProfile(profile),
    providerKinds: providers.map((provider) => provider.kind),
    isMock: findings.every((finding) => finding.isMock),
  };
}
