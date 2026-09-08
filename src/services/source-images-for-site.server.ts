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
  section: ImageRequirement["section"],
): ImageRequirement {
  const profile = createVisualProfile(request.lead, request.style);
  const showcaseIndex = section.startsWith("showcase-") ? Number(section.slice(-1)) - 1 : 0;
  const featuredService =
    profile.services[showcaseIndex] || profile.services[0] || profile.industry;
  const serviceContext = section.startsWith("showcase-")
    ? featuredService
    : profile.services.slice(0, 2).join(" ") || profile.industry;
  const subject =
    section === "hero"
      ? `${featuredService} finished result environment no people`
      : section === "about"
        ? `${featuredService} industry equipment tools workspace no people`
        : `${featuredService} close detail materials finished result no people`;
  const locationAwareQuery = `${profile.industry} ${serviceContext} ${subject}`;
  const creativeBrief = request.briefs?.[section]?.trim().slice(0, 300);
  return {
    section,
    dimensions: section === "hero" ? "1536x1024" : section === "about" ? "1024x1536" : "1200x900",
    orientation: section === "about" ? "portrait" : "landscape",
    searchQuery: creativeBrief || locationAwareQuery,
    searchQueries: [
      ...(creativeBrief ? [`${profile.industry} ${creativeBrief}`] : []),
      `${profile.industry} ${serviceContext} ${subject}`,
      `${serviceContext} ${subject}`,
      `${profile.industry} ${featuredService} no people`,
      ...(profile.location ? [`${profile.industry} ${profile.location} ${featuredService}`] : []),
    ],
    alt: imageAlt(profile, section),
  };
}

export async function sourceImagesForSite(
  request: ImageSourcingRequest,
): Promise<ImageSelectionResult> {
  const sections = request.sections ?? ["hero", "about", "showcase-1", "showcase-2", "showcase-3"];
  const profile = createVisualProfile(request.lead, request.style);
  const requirements = sections.map((section) => requirementFor(request, section));
  const usedSourceUrls = new Set<string>();
  const selected: ImageAsset[] = [];
  const missing: ImageRequirement["section"][] = [];

  for (const requirement of requirements) {
    const pexelsImage = await findPexelsImage(requirement, usedSourceUrls);
    if (pexelsImage) {
      selected.push(pexelsImage);
      if (pexelsImage.originalSourceUrl) usedSourceUrls.add(pexelsImage.originalSourceUrl);
      continue;
    }
    missing.push(requirement.section);
  }

  if (missing.length > 0) {
    throw new Error(`Pexels could not source required images for: ${missing.join(", ")}.`);
  }

  return {
    visualProfile: profile,
    requirements,
    assets: selected,
    unavailableSections: missing,
  };
}
