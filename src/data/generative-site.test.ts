import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  colorContrast,
  demoPresentationOverridesSchema,
  generativeDirections,
  validateGenerativeSiteBundle,
  type GenerativeDirection,
  type GenerativeSiteVariant,
} from "./generative-site";

function variant(direction: GenerativeDirection, index: number): GenerativeSiteVariant {
  const heroLayouts = ["split", "offset", "editorial", "stacked", "panorama"] as const;
  return {
    direction,
    concept: `${direction} concept for a neighborhood bakery`,
    conversionGoal: "Help customers understand the bakery and start an order.",
    palette: {
      background: "#F7F2E9",
      surface: "#FFFFFF",
      surfaceText: "#17130F",
      text: "#17130F",
      mutedText: "#51483F",
      contrast: "#201914",
      contrastText: "#F7F2E9",
      accent: "#9A451F",
      accentText: "#FFFFFF",
    },
    typography: "editorial-serif" as const,
    shape: "soft" as const,
    density: "balanced" as const,
    motion: "fluid" as const,
    sections: [
      {
        id: `hero-${index}`,
        kind: "hero" as const,
        eyebrow: "Bread, pastry, and celebration",
        heading: `${direction} bread worth gathering around`,
        body: "Freshly baked favorites for everyday tables and meaningful occasions.",
        layout: heroLayouts[index]!,
        tone: "base" as const,
        mediaSlot: "hero" as const,
        items: [],
        ctaLabel: "Plan an order",
      },
      ...["bread", "pastry", "cakes"].map((name) => ({
        id: `${name}-${index}`,
        kind: "feature" as const,
        eyebrow: "From the bakery",
        heading: `${name} made with intention`,
        body: `A focused look at the bakery's ${name} offering.`,
        layout: "editorial" as const,
        tone: "base" as const,
        mediaSlot: "about" as const,
        items: [],
        ctaLabel: "Ask about availability",
      })),
      {
        id: `faq-${index}`,
        kind: "faq" as const,
        eyebrow: "Before you order",
        heading: "Bakery questions, answered",
        body: "Useful starting points for planning an order.",
        layout: "split" as const,
        tone: "base" as const,
        mediaSlot: "none" as const,
        items: ["ordering", "timing", "flavors", "pickup"].map((title) => ({
          title,
          body: `Contact the bakery to confirm ${title} for your order.`,
          meta: "",
        })),
        ctaLabel: "",
      },
      {
        id: `contact-${index}`,
        kind: "contact" as const,
        eyebrow: "Start an order",
        heading: "Tell us what you are planning",
        body: "Share the occasion, timing, and baked goods you have in mind.",
        layout: "stacked" as const,
        tone: "contrast" as const,
        mediaSlot: "none" as const,
        items: [],
        ctaLabel: "Send an inquiry",
      },
    ],
  };
}

describe("generative site document validation", () => {
  test("accepts exactly one independent site for every direction", () => {
    const bundle = validateGenerativeSiteBundle({
      schemaVersion: 2,
      recommendedDirection: "professional",
      variants: generativeDirections.map(variant),
    });

    assert.equal(bundle.variants.length, 5);
    assert.deepEqual(
      bundle.variants.map((entry) => entry.direction).sort(),
      [...generativeDirections].sort(),
    );
  });

  test("repairs unsafe model-selected foreground colors", () => {
    const variants = generativeDirections.map(variant);
    variants[0]!.palette.text = "#F7F2E9";
    variants[0]!.palette.surfaceText = "#FFFFFF";
    const bundle = validateGenerativeSiteBundle({
      schemaVersion: 2,
      recommendedDirection: "professional",
      variants,
    });

    assert.ok(
      colorContrast(bundle.variants[0]!.palette.background, bundle.variants[0]!.palette.text) >=
        4.5,
    );
    assert.ok(
      colorContrast(bundle.variants[0]!.palette.surface, bundle.variants[0]!.palette.surfaceText) >=
        4.5,
    );
  });

  test("rejects five skins that reuse one composition", () => {
    const variants = generativeDirections.map((direction, index) => {
      const generated = variant(direction, index);
      generated.sections = generated.sections.map((section) => ({
        ...section,
        id: section.id.replace(`-${index}`, `-${direction}`),
        layout: section.kind === "hero" ? ("split" as const) : section.layout,
      }));
      return generated;
    });
    assert.throws(() =>
      validateGenerativeSiteBundle({
        schemaVersion: 2,
        recommendedDirection: "professional",
        variants,
      }),
    );
  });

  test("validates safe per-section colors and Pexels image assignments", () => {
    const result = demoPresentationOverridesSchema.parse({
      visualDirection: "modern",
      themeId: "original",
      fontId: "clean",
      sectionStyles: {
        hero: { backgroundColor: "#121820", textColor: "#FFFFFF" },
      },
      imageAssignments: { hero: "gallery-2" },
    });

    assert.equal(result.sectionStyles["hero"]?.backgroundColor, "#121820");
    assert.equal(result.imageAssignments["hero"], "gallery-2");
    assert.throws(() =>
      demoPresentationOverridesSchema.parse({
        sectionStyles: { hero: { backgroundColor: "javascript:alert(1)", textColor: "#FFFFFF" } },
        imageAssignments: {},
      }),
    );
  });

  test("repairs user-selected section text before the override can be saved", () => {
    const result = demoPresentationOverridesSchema.parse({
      sectionStyles: {
        hero: { backgroundColor: "#25282D", textColor: "#33363B" },
      },
      imageAssignments: {},
    });
    const hero = result.sectionStyles["hero"]!;
    assert.ok(colorContrast(hero.backgroundColor, hero.textColor) >= 4.5);
  });
});
