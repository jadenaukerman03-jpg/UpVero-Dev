import type {
  ImageAsset,
  ImageRequirement,
  ImageSelectionResult,
  ImageSourcingRequest,
} from "@/data/visuals";
import { validateSiteSpecV3, type SiteSpecV3 } from "@/generation/contracts/site-spec-v3";
import { createVisualProfile, imageAlt } from "./create-visual-profile";
import { findPexelsImage } from "./pexels-image-provider.server";
import { generateAiImageForAsset } from "./openai-image-provider.server";

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

  // Preserve every valid result. Previously, one unavailable section caused
  // all successfully selected Pexels assets to be discarded before they could
  // be persisted, leaving the entire preview image-free.
  if (selected.length === 0) {
    throw new Error(`Pexels could not source images for: ${missing.join(", ")}.`);
  }

  return {
    visualProfile: profile,
    requirements,
    assets: selected,
    unavailableSections: missing,
  };
}

function orientationForAspect(aspect: SiteSpecV3["media"]["assets"][number]["aspectRatio"]) {
  const [width, height] = aspect.split(":").map(Number);
  return width! >= height! ? ("landscape" as const) : ("portrait" as const);
}

/** Selects licensed imagery for the variable media plan authored by V3. */
export async function sourceImagesForSiteSpecV3(spec: SiteSpecV3): Promise<{
  spec: SiteSpecV3;
  sourced: number;
  missing: string[];
}> {
  const usedSourceUrls = new Set<string>();
  const resolved: SiteSpecV3["media"]["assets"] = [];
  const missing: string[] = [];
  for (const asset of spec.media.assets.slice(0, 16)) {
    if (asset.imageUrl && asset.sourceUrl) {
      usedSourceUrls.add(asset.sourceUrl);
      resolved.push(asset);
      continue;
    }
    // Bespoke AI imagery matched to this business's own art direction, first; Pexels stock is
    // only a fallback when generation is unconfigured or fails.
    const aiImage = await generateAiImageForAsset(
      asset,
      spec.designSystem.imagery,
      spec.designSystem.conceptName,
    );
    if (aiImage) {
      const { sourceUrl: _sourceUrl, attribution: _attribution, ...withoutSource } = asset;
      resolved.push({ ...withoutSource, imageUrl: aiImage.imageUrl, provider: aiImage.provider });
      continue;
    }
    const orientation = orientationForAspect(asset.aspectRatio);
    const selected = await findPexelsImage(
      {
        section: asset.id,
        dimensions: orientation === "landscape" ? "1536x1024" : "1024x1536",
        orientation,
        searchQuery: `${asset.query} no people no faces no hands no text no logos`,
        searchQueries: [
          `${asset.purpose} ${asset.query} environment no people`,
          `${asset.query} objects equipment architecture no people`,
        ],
        alt: asset.alt,
      },
      usedSourceUrls,
    );
    if (!selected?.src || !selected.originalSourceUrl) {
      missing.push(asset.id);
      resolved.push(asset);
      continue;
    }
    usedSourceUrls.add(selected.originalSourceUrl);
    resolved.push({
      ...asset,
      imageUrl: selected.src,
      sourceUrl: selected.originalSourceUrl,
      provider: "Pexels",
      attribution: selected.attribution ?? "Photo provided by Pexels",
    });
  }
  return {
    spec: validateSiteSpecV3({ ...spec, media: { assets: resolved } }),
    sourced: resolved.filter((asset) => asset.imageUrl).length,
    missing,
  };
}
