import { z } from "zod";

import type { LeadInput } from "@/data/leads";

export type ResearchProviderKind = "registry" | "web-search" | "maps" | "website" | "mock";
export type ResearchConfidence = "high" | "medium" | "low" | "unavailable";

export interface ResearchQuery {
  businessName: string;
  city?: string | undefined;
  state?: string | undefined;
  websiteUrl?: string | undefined;
  providerMode?: "real" | "mock" | undefined;
}

export interface ResearchFinding {
  source: ResearchProviderKind;
  sourceUrl?: string | undefined;
  pageTitle?: string | undefined;
  timestamp: string;
  rawFindings: string;
  confidence: ResearchConfidence;
  fields: Partial<Record<ResearchFieldName, string | string[]>>;
  isMock: boolean;
}

export type ResearchFieldName =
  | "businessName"
  | "industry"
  | "phone"
  | "email"
  | "address"
  | "serviceAreas"
  | "services"
  | "businessDescription"
  | "websiteUrl"
  | "socialProfiles"
  | "registrationDate"
  | "entityType";

export interface ResearchFieldEvidence {
  value: string | string[];
  confidence: ResearchConfidence;
  sources: ResearchFinding[];
}

export interface BusinessResearchProfile {
  businessName?: ResearchFieldEvidence | undefined;
  industry?: ResearchFieldEvidence | undefined;
  phone?: ResearchFieldEvidence | undefined;
  email?: ResearchFieldEvidence | undefined;
  address?: ResearchFieldEvidence | undefined;
  serviceAreas?: ResearchFieldEvidence | undefined;
  services?: ResearchFieldEvidence | undefined;
  businessDescription?: ResearchFieldEvidence | undefined;
  websiteUrl?: ResearchFieldEvidence | undefined;
  socialProfiles?: ResearchFieldEvidence | undefined;
  registrationDate?: ResearchFieldEvidence | undefined;
  entityType?: ResearchFieldEvidence | undefined;
  sources: ResearchFinding[];
  completeness: number;
  additionalNotes: string;
}

export interface ResearchJobResult {
  jobId: string;
  query: ResearchQuery;
  profile: BusinessResearchProfile;
  normalizedLead: LeadInput;
  providerKinds: ResearchProviderKind[];
  isMock: boolean;
}

const optionalText = z.string().trim().optional();

export const researchQuerySchema: z.ZodType<ResearchQuery> = z.object({
  businessName: z.string().trim().min(1, "Business name is required."),
  city: optionalText,
  state: optionalText,
  websiteUrl: z.string().trim().url("Enter a valid website URL.").optional().or(z.literal("")),
  providerMode: z.enum(["real", "mock"]).optional(),
});
