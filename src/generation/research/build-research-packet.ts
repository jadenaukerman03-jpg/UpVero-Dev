import type { Lead } from "@/data/leads";
import type {
  BusinessResearchProfile,
  ResearchFieldEvidence,
  ResearchFieldName,
} from "@/data/research";
import { researchPacketSchema, type ResearchPacket } from "@/generation/contracts/site-spec-v3";

const leadFields: Array<{
  field: ResearchFieldName | "city" | "state" | "zipCode" | "ownerName";
  value: (lead: Lead) => string | string[] | number | undefined;
}> = [
  { field: "businessName", value: (lead) => lead.businessName },
  { field: "industry", value: (lead) => lead.industry },
  { field: "phone", value: (lead) => lead.phone },
  { field: "email", value: (lead) => lead.email },
  { field: "address", value: (lead) => lead.address },
  { field: "city", value: (lead) => lead.city },
  { field: "state", value: (lead) => lead.state },
  { field: "zipCode", value: (lead) => lead.zipCode },
  { field: "ownerName", value: (lead) => lead.ownerName },
  { field: "serviceAreas", value: (lead) => lead.serviceAreas },
  { field: "services", value: (lead) => lead.services },
  { field: "businessDescription", value: (lead) => lead.businessDescription },
  { field: "websiteUrl", value: (lead) => lead.website },
  { field: "registrationDate", value: () => undefined },
  { field: "entityType", value: () => undefined },
];

const missingLabels: Record<string, string> = {
  businessName: "business name",
  industry: "business category",
  phone: "public phone number",
  email: "public email address",
  address: "business address",
  city: "city",
  state: "state",
  serviceAreas: "service area",
  services: "specific services or offers",
  businessDescription: "business description",
  websiteUrl: "official website",
};

function stringValue(value: string | string[] | number | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "number") return String(value);
  return value?.trim();
}

function confidenceNumber(confidence: ResearchFieldEvidence["confidence"]) {
  return { high: 0.95, medium: 0.72, low: 0.45, unavailable: 0 }[confidence];
}

function firstPublicSource(evidence: ResearchFieldEvidence | undefined) {
  return evidence?.sources.find((source) => !source.isMock && source.sourceUrl)?.sourceUrl;
}

/**
 * Creates the immutable factual boundary consumed by every creative stage.
 * Registry/web findings retain citations; form values remain explicitly user-supplied.
 */
export function buildResearchPacket(lead: Lead, profile?: BusinessResearchProfile): ResearchPacket {
  const facts = leadFields.flatMap(({ field, value }) => {
    const suppliedValue = stringValue(value(lead));
    const evidence =
      field in (profile ?? {})
        ? (profile?.[field as ResearchFieldName] as ResearchFieldEvidence | undefined)
        : undefined;
    const researchedValue = stringValue(evidence?.value);
    const finalValue = researchedValue || suppliedValue;
    if (!finalValue) return [];
    const sourceUrl = firstPublicSource(evidence);
    return [
      {
        field,
        value: finalValue,
        provenance: sourceUrl ? ("publicly-verified" as const) : ("user-supplied" as const),
        confidence: sourceUrl ? confidenceNumber(evidence!.confidence) : 1,
        ...(sourceUrl ? { sourceUrl } : {}),
        ...(sourceUrl
          ? { evidence: `Reported by ${evidence!.sources.length} public research source(s).` }
          : {}),
      },
    ];
  });

  const present = new Set<string>(facts.map((fact) => fact.field));
  const missingInformation = Object.entries(missingLabels)
    .filter(([field]) => !present.has(field))
    .map(([, label]) => label);
  const summaryParts = [
    lead.businessName || "An unnamed business",
    lead.industry ? `operates in ${lead.industry}` : "has not supplied a category",
    lead.businessDescription || "No detailed offer description is available yet.",
    [lead.city, lead.state].filter(Boolean).length
      ? `Known location: ${[lead.city, lead.state].filter(Boolean).join(", ")}.`
      : "No operating location is confirmed.",
  ];

  return researchPacketSchema.parse({
    businessSummary: summaryParts.join(" ").slice(0, 2_000),
    facts,
    missingInformation,
    reasonableInferences: [],
    completeness: profile?.completeness ?? Math.round((facts.length / leadFields.length) * 100),
  });
}
