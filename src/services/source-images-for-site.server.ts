import type {
  ImageAsset,
  ImageRequirement,
  ImageSelectionResult,
  ImageSourcingRequest,
} from "@/data/visuals";
import { createVisualProfile, imageAlt } from "./create-visual-profile";
import { findPexelsImage } from "./pexels-image-provider.server";

function requirementFor(
  request: ImageSourcingRequest,
  section: "hero" | "about",
): ImageRequirement {
  const profile = createVisualProfile(request.lead, request.style);
  const serviceContext = profile.services.slice(0, 2).join(" ") || profile.industry;
  const locationContext = profile.location ? ` ${profile.location}` : "";
  const subject =
    section === "hero"
      ? "professional exterior project"
      : "professional environment";
  const locationAwareQuery = `${profile.industry} ${serviceContext}${locationContext} ${subject}`;
  return {
    section,
    dimensions: section === "hero" ? "1536x1024" : "1024x1536",
    orientation: section === "hero" ? "landscape" : "portrait",
    searchQuery: `${profile.businessName} ${locationAwareQuery}`,
    searchQueries: [locationAwareQuery, `${profile.industry} ${serviceContext} ${subject}`],
    alt: imageAlt(profile, section),
  };
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
    const pexelsImage = await findPexelsImage(requirement, usedSourceUrls);
    if (pexelsImage) {
      selected.push(pexelsImage);
      if (pexelsImage.originalSourceUrl) usedSourceUrls.add(pexelsImage.originalSourceUrl);
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
