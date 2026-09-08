import type { Lead } from "@/data/leads";
import type { ImageSection, VisualProfile, VisualStyle } from "@/data/visuals";

const styleDirections: Record<VisualStyle, string> = {
  professional: "polished, trustworthy, and editorial commercial photography",
  modern: "clean, contemporary, and design-forward commercial photography",
  luxury: "refined, premium, and carefully art-directed commercial photography",
  friendly: "warm, approachable, and inviting environmental commercial photography",
  minimal: "calm, uncluttered, and restrained commercial photography",
};

function valueOrFallback(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

export function createVisualProfile(lead: Lead, style: VisualStyle): VisualProfile {
  const location = [lead.city, lead.state].filter(Boolean).join(", ") || undefined;
  return {
    businessName: valueOrFallback(lead.businessName, "Local business"),
    industry: valueOrFallback(lead.industry, "local service business"),
    services: lead.services?.filter(Boolean).slice(0, 4) ?? [],
    location,
    brandDescription: lead.businessDescription?.trim() || undefined,
    style,
    visualDirection: styleDirections[style],
  };
}

function sharedConstraints(profile: VisualProfile): string {
  const services =
    profile.services.length > 0 ? profile.services.join(", ") : "the business's core work";
  const location = profile.location
    ? ` The setting should feel plausible for ${profile.location}.`
    : "";
  const description = profile.brandDescription
    ? ` Business context: ${profile.brandDescription}`
    : "";
  return `Create an original, photorealistic environmental commercial photograph for a ${profile.industry} business. Visual direction: ${profile.visualDirection}. Show authentic, realistic materials, lighting, detailed textures, strong composition, depth, leading lines, and environmental storytelling relevant to ${services}.${location}${description} PEOPLE ARE EXCLUDED: no people, no humans, no faces, no hands, no human subjects, no employees, no customers, no models, no crowds, and no human interactions. Do not include any text, letters, numbers, signage, logos, watermarks, stock-photo marks, UI elements, collages, or split screens. Do not imitate a known brand or use a real person's likeness. If a human-focused composition would ordinarily be expected, choose a visually rich objects-only, equipment-only, product-only, architecture-only, or environment-only composition instead.`;
}

export function buildImagePrompt(profile: VisualProfile, section: ImageSection): string {
  if (section === "hero") {
    return `${sharedConstraints(profile)} Compose a wide, premium website hero image with a strong environmental view of a finished project, storefront, interior, equipment, products, vehicles, materials, architecture, or other relevant business setting. Leave calm negative space around the central composition for the website crop. Use natural lighting and an intentional depth of field. The image must feel distinct from the about-section environment.`;
  }

  if (section === "about") {
    return `${sharedConstraints(profile)} Compose a vertical, premium about-section environmental photograph of a visually interesting workspace, finished project detail, professional interior, equipment arrangement, materials, product display, vehicle, landscape, or architectural feature. Use close environmental storytelling, layered depth, natural lighting, and tactile detail. The image must feel distinct from the hero image and must contain zero people.`;
  }

  return `${sharedConstraints(profile)} Compose a landscape editorial detail for showcase position ${section.slice(-1)}. Focus on one distinctive product, finished result, tool, material, architectural detail, environment, or piece of equipment that communicates the business without people. Make this composition clearly different from the hero and other showcase images.`;
}

export function imageAlt(profile: VisualProfile, section: ImageSection): string {
  const location = profile.location ? ` in ${profile.location}` : "";
  if (section === "hero") return `${profile.businessName} ${profile.industry} work${location}`;
  if (section === "about")
    return `${profile.businessName} professional business environment${location}`;
  return `${profile.businessName} ${profile.industry} featured detail${location}`;
}
