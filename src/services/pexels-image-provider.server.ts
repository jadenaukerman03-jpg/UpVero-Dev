import type { ImageAsset, ImageRequirement } from "@/data/visuals";

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  alt?: string;
  src: { large2x?: string; large?: string; landscape?: string; portrait?: string };
}

interface PexelsSearchResponse {
  photos?: PexelsPhoto[];
}

function scorePhoto(photo: PexelsPhoto, requirement: ImageRequirement): number {
  const aspectRatio = photo.width / photo.height;
  const expectedRatio = requirement.orientation === "landscape" ? 1.5 : 0.8;
  const orientationMatches =
    requirement.orientation === "landscape"
      ? photo.width >= photo.height
      : photo.height > photo.width;
  const aspectScore = Math.max(0, 20 - Math.abs(aspectRatio - expectedRatio) * 20);
  const sizeScore = photo.width >= 1200 && photo.height >= 900 ? 15 : 5;
  return (orientationMatches ? 55 : 20) + aspectScore + sizeScore + (photo.alt?.trim() ? 10 : 0);
}

function preferredPhotoUrl(photo: PexelsPhoto, requirement: ImageRequirement): string | undefined {
  return requirement.orientation === "landscape"
    ? photo.src.large2x || photo.src.large || photo.src.landscape
    : photo.src.large2x || photo.src.large || photo.src.portrait;
}

/** Approved, server-only Pexels provider. It remains inactive until PEXELS_API_KEY is configured. */
export async function findPexelsImage(
  requirement: ImageRequirement,
  usedSourceUrls: Set<string>,
): Promise<ImageAsset | undefined> {
  const apiKey = process.env["PEXELS_API_KEY"];
  if (!apiKey) return undefined;

  const search = new URL("https://api.pexels.com/v1/search");
  search.searchParams.set("query", requirement.searchQuery);
  search.searchParams.set("orientation", requirement.orientation);
  search.searchParams.set("size", "large");
  search.searchParams.set("per_page", "12");

  try {
    const response = await fetch(search, { headers: { Authorization: apiKey } });
    if (!response.ok) {
      console.error(`Pexels search failed for ${requirement.section}: ${response.status}`);
      return undefined;
    }
    const body = (await response.json()) as PexelsSearchResponse;
    const selected = (body.photos ?? [])
      .filter((photo) => !usedSourceUrls.has(photo.url))
      .map((photo) => ({ photo, score: scorePhoto(photo, requirement) }))
      .filter(({ score }) => score >= 70)
      .sort((left, right) => right.score - left.score)[0]?.photo;
    const src = selected ? preferredPhotoUrl(selected, requirement) : undefined;
    if (!selected || !src) return undefined;

    return {
      id: `pexels-${selected.id}`,
      section: requirement.section,
      status: "completed",
      alt: selected.alt?.trim() || requirement.alt,
      prompt: requirement.searchQuery,
      queryOrPromptSummary: requirement.searchQuery,
      dimensions: requirement.dimensions,
      generatedAt: new Date().toISOString(),
      src,
      cacheKey: `pexels-${selected.id}-${requirement.section}`,
      sourceType: "licensed_provider",
      providerName: "Pexels",
      originalSourceUrl: selected.url,
      attribution: `Photo by ${selected.photographer} on Pexels (${selected.photographer_url})`,
      licenseMetadata: "Pexels API result; retain provider attribution and linking requirements.",
      usagePermission: "provider-license",
    };
  } catch (error) {
    console.error(`Pexels search failed for ${requirement.section}`, error);
    return undefined;
  }
}
