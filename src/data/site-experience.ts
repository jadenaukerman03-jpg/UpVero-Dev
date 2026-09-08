import type { DemoVisualDirection } from "./demo-themes";
import {
  generatedSectionIds,
  type CreativeBlueprint,
  type GeneratedSectionId,
  type SiteConfig,
} from "./site";

const directionBlueprints: Record<
  DemoVisualDirection,
  Omit<CreativeBlueprint, "authoredFor" | "sectionOrder">
> = {
  professional: {
    archetype: "precision",
    heroLayout: "split",
    serviceLayout: "bento",
    density: "balanced",
    motion: "subtle",
    surfaceStyle: "outlined",
    imageTreatment: "natural",
  },
  modern: {
    archetype: "immersive",
    heroLayout: "showcase",
    serviceLayout: "bento",
    density: "compact",
    motion: "expressive",
    surfaceStyle: "glass",
    imageTreatment: "vivid",
  },
  luxury: {
    archetype: "editorial",
    heroLayout: "full-bleed",
    serviceLayout: "list",
    density: "cinematic",
    motion: "cinematic",
    surfaceStyle: "paper",
    imageTreatment: "editorial",
  },
  friendly: {
    archetype: "playful",
    heroLayout: "stacked",
    serviceLayout: "cards",
    density: "balanced",
    motion: "expressive",
    surfaceStyle: "soft",
    imageTreatment: "warm",
  },
  minimal: {
    archetype: "minimal",
    heroLayout: "editorial",
    serviceLayout: "list",
    density: "compact",
    motion: "subtle",
    surfaceStyle: "outlined",
    imageTreatment: "monochrome",
  },
};

const directionOrders: Record<DemoVisualDirection, GeneratedSectionId[]> = {
  professional: ["services", "showcase", "about", "process", "experience", "faq", "contact"],
  modern: ["showcase", "services", "process", "about", "experience", "faq", "contact"],
  luxury: ["about", "showcase", "services", "experience", "process", "faq", "contact"],
  friendly: ["services", "experience", "showcase", "about", "process", "faq", "contact"],
  minimal: ["services", "about", "process", "showcase", "experience", "faq", "contact"],
};

function normalizedOrder(order: GeneratedSectionId[] | undefined, fallback: GeneratedSectionId[]) {
  const requested = [
    ...new Set(order?.filter((section) => generatedSectionIds.includes(section)) ?? []),
  ].filter((section) => section !== "contact");
  const complete = [
    ...requested,
    ...fallback.filter((section) => section !== "contact" && !requested.includes(section)),
  ];
  return [...complete, "contact"] as GeneratedSectionId[];
}

export function resolveCreativeBlueprint(
  config: SiteConfig,
  direction: DemoVisualDirection,
): CreativeBlueprint {
  const generated = config.design?.blueprint;
  if (generated && generated.authoredFor === direction) {
    return {
      ...generated,
      sectionOrder: normalizedOrder(generated.sectionOrder, directionOrders[direction]),
    };
  }
  return {
    ...directionBlueprints[direction],
    authoredFor: direction,
    sectionOrder: directionOrders[direction],
  };
}

export function resolveSiteStory(config: SiteConfig): NonNullable<SiteConfig["story"]> {
  if (config.story) return config.story;
  const serviceItems = config.services.items.slice(0, 3);
  return {
    value: {
      eyebrow: config.about.eyebrow,
      heading: config.about.heading,
      body: config.about.body,
    },
    process: {
      eyebrow: "A clear path forward",
      heading: "From first conversation to the next confident step",
      items: serviceItems.map((service, index) => ({
        title: index === 0 ? "Start with what matters" : service.title,
        body: service.body,
      })),
    },
    showcase: {
      eyebrow: config.services.eyebrow,
      heading: config.services.heading,
      body: config.hero.description,
      items: serviceItems.map((service) => ({ title: service.title, body: service.body })),
    },
    closingCta: {
      eyebrow: config.contact.eyebrow,
      heading: config.contact.heading,
      body: config.contact.body,
    },
  };
}
