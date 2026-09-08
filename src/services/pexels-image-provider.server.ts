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

export class PexelsImageProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PexelsImageProviderError";
  }
}

const PEOPLE_PATTERN =
  /\b(person|people|human|man|men|woman|women|worker|employee|customer|chef|mechanic|contractor|gardener|landscaper|instructor|staff|hand|hands|portrait|model|crowd|couple|family|boy|girl)\b/i;

function keywords(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(
        (word) =>
          word.length > 3 && !["professional", "premium", "business", "editorial"].includes(word),
      ),
  );
}

function scorePhoto(photo: PexelsPhoto, requirement: ImageRequirement, query: string): number {
  const aspectRatio = photo.width / photo.height;
  const expectedRatio = requirement.orientation === "landscape" ? 1.5 : 0.8;
  const orientationMatches =
    requirement.orientation === "landscape"
      ? photo.width >= photo.height
      : photo.height > photo.width;
  const aspectScore = Math.max(0, 20 - Math.abs(aspectRatio - expectedRatio) * 20);
  const sizeScore = photo.width >= 1200 && photo.height >= 900 ? 15 : 5;
  const searchable = `${photo.alt ?? ""} ${photo.url}`;
  if (PEOPLE_PATTERN.test(searchable)) return 0;
  const queryWords = keywords(`${requirement.searchQuery} ${query}`);
  const photoWords = keywords(searchable);
  const overlap = [...queryWords].filter((word) => photoWords.has(word)).length;
  const semanticScore = Math.min(36, overlap * 9);
  return (
    (orientationMatches ? 42 : 10) +
    aspectScore +
    sizeScore +
    semanticScore +
    (photo.alt?.trim() ? 6 : 0)
  );
}

function preferredPhotoUrl(photo: PexelsPhoto, requirement: ImageRequirement): string | undefined {
  return requirement.orientation === "landscape"
    ? photo.src.large2x || photo.src.large || photo.src.landscape
    : photo.src.large2x || photo.src.large || photo.src.portrait;
}

function isPexelsImageUrl(value: string): boolean {
  try {
    return new URL(value).hostname === "images.pexels.com";
  } catch {
    return false;
  }
}

/** Approved, server-only Pexels provider. It remains inactive until PEXELS_API_KEY is configured. */
export async function findPexelsImage(
  requirement: ImageRequirement,
  usedSourceUrls: Set<string>,
): Promise<ImageAsset | undefined> {
  const apiKey = process.env["PEXELS_API_KEY"];
  if (!apiKey) {
    throw new PexelsImageProviderError(
      "Pexels image sourcing is not configured on the application server.",
    );
  }

  const queries = [requirement.searchQuery, ...(requirement.searchQueries ?? [])];

  const candidates: Array<{ photo: PexelsPhoto; query: string; score: number }> = [];
  let successfulSearches = 0;
  let providerFailures = 0;

  for (const [queryIndex, query] of queries.slice(0, 5).entries()) {
    const search = new URL("https://api.pexels.com/v1/search");
    search.searchParams.set("query", query);
    search.searchParams.set("orientation", requirement.orientation);
    search.searchParams.set("size", "large");
    search.searchParams.set("per_page", "40");

    try {
      const response = await fetch(search, { headers: { Authorization: apiKey } });
      if (!response.ok) {
        console.error(`Pexels search failed for ${requirement.section}: ${response.status}`);
        if (response.status === 401 || response.status === 403) {
          throw new PexelsImageProviderError(
            "Pexels rejected the server's image-provider credentials.",
          );
        }
        if (response.status === 429) {
          throw new PexelsImageProviderError(
            "Pexels image sourcing is temporarily rate-limited. Please retry later.",
          );
        }
        providerFailures += 1;
        continue;
      }
      successfulSearches += 1;
      const body = (await response.json()) as PexelsSearchResponse;
      for (const [photoIndex, photo] of (body.photos ?? []).entries()) {
        if (!usedSourceUrls.has(photo.url)) {
          const providerRelevance = Math.max(0, 24 - photoIndex);
          const queryPriority = Math.max(0, 36 - queryIndex * 9);
          candidates.push({
            photo,
            query,
            score: scorePhoto(photo, requirement, query) + providerRelevance + queryPriority,
          });
        }
      }
      if (candidates.some(({ score }) => score >= 68)) break;
    } catch (error) {
      if (error instanceof PexelsImageProviderError) throw error;
      providerFailures += 1;
      console.error(`Pexels search failed for ${requirement.section}`, error);
    }
  }

  if (successfulSearches === 0 && providerFailures > 0) {
    throw new PexelsImageProviderError(
      "Pexels image sourcing could not be reached from the application server.",
    );
  }

  const selected = candidates
    .filter(({ score }) => score >= 68)
    .sort((left, right) => right.score - left.score)[0];
  const src = selected ? preferredPhotoUrl(selected.photo, requirement) : undefined;
  if (!selected || !src || !isPexelsImageUrl(src)) return undefined;

  return {
    id: `pexels-${selected.photo.id}`,
    section: requirement.section,
    status: "completed",
    alt: selected.photo.alt?.trim() || requirement.alt,
    prompt: selected.query,
    queryOrPromptSummary: selected.query,
    dimensions: requirement.dimensions,
    generatedAt: new Date().toISOString(),
    src,
    cacheKey: `pexels-${selected.photo.id}-${requirement.section}`,
    sourceType: "pexels",
    providerName: "Pexels",
    originalSourceUrl: selected.photo.url,
    attribution: `Photo by ${selected.photo.photographer} on Pexels (${selected.photo.photographer_url})`,
    licenseMetadata: "Pexels API result; retain provider attribution and linking requirements.",
    usagePermission: "provider-license",
  };
}
