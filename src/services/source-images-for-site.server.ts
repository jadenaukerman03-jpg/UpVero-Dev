import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { leadSchema } from "@/data/leads";
import type {
  ImageAsset,
  ImageRequirement,
  ImageSelectionResult,
  ImageSourcingRequest,
} from "@/data/visuals";
import { createVisualProfile, imageAlt } from "./create-visual-profile";
import { findPexelsImage } from "./pexels-image-provider.server";

const sourcingRequestSchema = z.object({
  lead: leadSchema,
  style: z.enum(["professional", "modern", "luxury", "friendly", "minimal"]),
  sections: z
    .array(z.enum(["hero", "about"]))
    .min(1)
    .max(2)
    .optional(),
  authorizedBusinessImages: z.array(z.custom<ImageAsset>()).optional(),
});

function requirementFor(
  request: ImageSourcingRequest,
  section: "hero" | "about",
): ImageRequirement {
  const profile = createVisualProfile(request.lead, request.style);
  const serviceContext = profile.services.slice(0, 2).join(" ") || profile.industry;
  return {
    section,
    dimensions: section === "hero" ? "1536x1024" : "1024x1536",
    orientation: section === "hero" ? "landscape" : "portrait",
    searchQuery:
      section === "hero"
        ? `${profile.visualDirection} ${profile.industry} ${serviceContext} professional commercial exterior work`
        : `${profile.visualDirection} ${profile.industry} professional environment ${serviceContext}`,
    alt: imageAlt(profile, section),
  };
}

function authorizedAssetFor(
  assets: ImageAsset[] | undefined,
  requirement: ImageRequirement,
): ImageAsset | undefined {
  return assets?.find(
    (asset) =>
      asset.section === requirement.section &&
      asset.sourceType === "business" &&
      asset.usagePermission === "authorized" &&
      Boolean(asset.src),
  );
}

export async function sourceImagesForSite(
  request: ImageSourcingRequest,
): Promise<ImageSelectionResult> {
  const sections = request.sections ?? ["hero", "about"];
  const profile = createVisualProfile(request.lead, request.style);
  const requirements = sections.map((section) => requirementFor(request, section));
  const usedSourceUrls = new Set<string>();
  const selected: ImageAsset[] = [];
  const missing: ("hero" | "about")[] = [];

  for (const requirement of requirements) {
    const authorized = authorizedAssetFor(request.authorizedBusinessImages, requirement);
    if (authorized) {
      selected.push({ ...authorized, status: "completed" });
      if (authorized.originalSourceUrl) usedSourceUrls.add(authorized.originalSourceUrl);
      continue;
    }

    const licensed = await findPexelsImage(requirement, usedSourceUrls);
    if (licensed) {
      selected.push(licensed);
      if (licensed.originalSourceUrl) usedSourceUrls.add(licensed.originalSourceUrl);
      continue;
    }
    missing.push(requirement.section);
  }

  return {
    visualProfile: profile,
    requirements,
    assets: selected,
    unavailableSections: missing,
  };
}

/** Server-only orchestration: authorized business image → approved licensed provider → image-free fallback. */
export const sourceImagesForSiteServer = createServerFn({ method: "POST" })
  .validator((data: unknown) => sourcingRequestSchema.parse(data))
  .handler(async ({ data }) => sourceImagesForSite(data));
