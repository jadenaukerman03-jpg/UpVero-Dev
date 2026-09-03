import type { Lead } from "./leads";

/** A deliberately small set of visual directions that can later become richer controls. */
export const visualStyleOptions = [
  "professional",
  "modern",
  "luxury",
  "friendly",
  "minimal",
] as const;

export type VisualStyle = (typeof visualStyleOptions)[number];
export type ImageSection = "hero" | "about";
export type ImageSelectionStatus = "completed" | "failed" | "unavailable";
export type ImageSourceType = "pexels";

export interface VisualProfile {
  businessName: string;
  industry: string;
  services: string[];
  location?: string | undefined;
  brandDescription?: string | undefined;
  style: VisualStyle;
  visualDirection: string;
}

export interface ImageAsset {
  id: string;
  section: ImageSection;
  status: ImageSelectionStatus;
  alt: string;
  prompt: string;
  dimensions: "1536x1024" | "1024x1536";
  generatedAt?: string | undefined;
  src?: string | undefined;
  cacheKey: string;
  error?: string | undefined;
  sourceType: ImageSourceType;
  providerName?: string | undefined;
  originalSourceUrl?: string | undefined;
  attribution?: string | undefined;
  licenseMetadata?: string | undefined;
  usagePermission: "authorized" | "provider-license";
  queryOrPromptSummary: string;
}

export interface ImageRequirement {
  section: ImageSection;
  dimensions: "1536x1024" | "1024x1536";
  orientation: "landscape" | "portrait";
  searchQuery: string;
  /** Ordered Pexels-only alternatives when a business-name query is too specific. */
  searchQueries?: string[];
  alt: string;
}

export interface ImageSelectionResult {
  visualProfile: VisualProfile;
  assets: ImageAsset[];
  requirements: ImageRequirement[];
  unavailableSections: ImageSection[];
}

export interface ImageSourcingRequest {
  lead: Lead;
  style: VisualStyle;
  sections?: ImageSection[] | undefined;
}
