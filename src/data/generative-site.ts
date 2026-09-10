import { z } from "zod";

import {
  closestReadableColor,
  contrastRatio,
  repairGeneratedPalette,
  type GeneratedPalette,
} from "@/lib/color-contrast";

export const generativeDirections = [
  "professional",
  "modern",
  "luxury",
  "friendly",
  "minimal",
] as const;
export type GenerativeDirection = (typeof generativeDirections)[number];

export const generativeSectionKinds = [
  "hero",
  "statement",
  "offers",
  "feature",
  "gallery",
  "process",
  "proof",
  "faq",
  "contact",
] as const;
export type GenerativeSectionKind = (typeof generativeSectionKinds)[number];

export const generativeLayouts = [
  "split",
  "stacked",
  "grid",
  "mosaic",
  "editorial",
  "offset",
  "timeline",
  "panorama",
] as const;
export type GenerativeLayout = (typeof generativeLayouts)[number];

export const generativeMediaSlots = [
  "none",
  "hero",
  "about",
  "gallery-1",
  "gallery-2",
  "gallery-3",
] as const;
export type GenerativeMediaSlot = (typeof generativeMediaSlots)[number];

const generatedItemJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "body", "meta"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 100 },
    body: { type: "string", minLength: 1, maxLength: 420 },
    meta: { type: "string", maxLength: 80 },
  },
} as const;

const generatedSectionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "kind",
    "eyebrow",
    "heading",
    "body",
    "layout",
    "tone",
    "mediaSlot",
    "items",
    "ctaLabel",
  ],
  properties: {
    id: { type: "string", minLength: 2, maxLength: 40, pattern: "^[a-z0-9-]+$" },
    kind: { type: "string", enum: generativeSectionKinds },
    eyebrow: { type: "string", maxLength: 80 },
    heading: { type: "string", minLength: 1, maxLength: 180 },
    body: { type: "string", minLength: 1, maxLength: 700 },
    layout: { type: "string", enum: generativeLayouts },
    tone: { type: "string", enum: ["base", "contrast", "accent"] },
    mediaSlot: { type: "string", enum: generativeMediaSlots },
    items: { type: "array", maxItems: 6, items: generatedItemJsonSchema },
    ctaLabel: { type: "string", maxLength: 60 },
  },
} as const;

const generatedVariantJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "direction",
    "concept",
    "conversionGoal",
    "palette",
    "typography",
    "shape",
    "density",
    "motion",
    "sections",
  ],
  properties: {
    direction: { type: "string", enum: generativeDirections },
    concept: { type: "string", minLength: 8, maxLength: 180 },
    conversionGoal: { type: "string", minLength: 8, maxLength: 220 },
    palette: {
      type: "object",
      additionalProperties: false,
      required: [
        "background",
        "surface",
        "surfaceText",
        "text",
        "mutedText",
        "contrast",
        "contrastText",
        "accent",
        "accentText",
      ],
      properties: Object.fromEntries(
        [
          "background",
          "surface",
          "surfaceText",
          "text",
          "mutedText",
          "contrast",
          "contrastText",
          "accent",
          "accentText",
        ].map((name) => [name, { type: "string", pattern: "^#[0-9a-fA-F]{6}$" }]),
      ),
    },
    typography: {
      type: "string",
      enum: ["clean-sans", "editorial-serif", "technical", "humanist", "classic"],
    },
    shape: { type: "string", enum: ["sharp", "soft", "rounded", "organic"] },
    density: { type: "string", enum: ["compact", "balanced", "airy"] },
    motion: { type: "string", enum: ["restrained", "fluid", "expressive"] },
    sections: {
      type: "array",
      minItems: 6,
      maxItems: 10,
      items: generatedSectionJsonSchema,
    },
  },
} as const;

/** Strict Responses API schema; runtime validation below adds cross-field rules. */
export const GENERATIVE_SITE_BUNDLE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "recommendedDirection", "variants"],
  properties: {
    schemaVersion: { type: "integer", enum: [2] },
    recommendedDirection: { type: "string", enum: generativeDirections },
    variants: {
      type: "array",
      minItems: generativeDirections.length,
      maxItems: generativeDirections.length,
      items: generatedVariantJsonSchema,
    },
  },
} as const;

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const generativeSiteItemSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(420),
  meta: z.string().trim().max(80),
});

export const generativeSiteSectionSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/),
  kind: z.enum(generativeSectionKinds),
  eyebrow: z.string().trim().max(80),
  heading: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(700),
  layout: z.enum(generativeLayouts),
  tone: z.enum(["base", "contrast", "accent"]),
  mediaSlot: z.enum(generativeMediaSlots),
  items: z.array(generativeSiteItemSchema).max(6),
  ctaLabel: z.string().trim().max(60),
});

export const generativeSiteVariantSchema = z
  .object({
    direction: z.enum(generativeDirections),
    concept: z.string().trim().min(8).max(180),
    conversionGoal: z.string().trim().min(8).max(220),
    palette: z.object({
      background: hexColorSchema,
      surface: hexColorSchema,
      surfaceText: hexColorSchema,
      text: hexColorSchema,
      mutedText: hexColorSchema,
      contrast: hexColorSchema,
      contrastText: hexColorSchema,
      accent: hexColorSchema,
      accentText: hexColorSchema,
    }),
    typography: z.enum(["clean-sans", "editorial-serif", "technical", "humanist", "classic"]),
    shape: z.enum(["sharp", "soft", "rounded", "organic"]),
    density: z.enum(["compact", "balanced", "airy"]),
    motion: z.enum(["restrained", "fluid", "expressive"]),
    sections: z.array(generativeSiteSectionSchema).min(6).max(10),
  })
  .superRefine((variant, context) => {
    const ids = new Set<string>();
    for (const [index, section] of variant.sections.entries()) {
      if (ids.has(section.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sections", index, "id"],
          message: "Section ids must be unique within a variant.",
        });
      }
      ids.add(section.id);
    }
    if (variant.sections[0]?.kind !== "hero") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sections", 0, "kind"],
        message: "Every generated site must begin with its hero.",
      });
    }
    if (variant.sections.filter((section) => section.kind === "hero").length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sections"],
        message: "Every generated site requires exactly one hero.",
      });
    }
    if (variant.sections.filter((section) => section.kind === "contact").length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sections"],
        message: "Every generated site requires exactly one contact section.",
      });
    }
  });

export const generativeSiteBundleSchema = z
  .object({
    schemaVersion: z.literal(2),
    recommendedDirection: z.enum(generativeDirections),
    variants: z.array(generativeSiteVariantSchema).length(generativeDirections.length),
  })
  .superRefine((bundle, context) => {
    const directions = bundle.variants.map((variant) => variant.direction);
    for (const direction of generativeDirections) {
      if (directions.filter((candidate) => candidate === direction).length !== 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants"],
          message: `The bundle requires exactly one ${direction} site.`,
        });
      }
    }
    const heroHeadings = bundle.variants.map((variant) =>
      variant.sections[0]!.heading.toLowerCase().replace(/[^a-z0-9]+/g, ""),
    );
    if (new Set(heroHeadings).size !== heroHeadings.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants"],
        message: "Each visual direction needs an independently written hero headline.",
      });
    }
    const structures = bundle.variants.map((variant) =>
      variant.sections.map((section) => `${section.kind}:${section.layout}`).join("|"),
    );
    if (new Set(structures).size !== structures.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants"],
        message: "Each visual direction needs an independent composition.",
      });
    }
  });

export type GenerativeSiteItem = z.infer<typeof generativeSiteItemSchema>;
export type GenerativeSiteSection = z.infer<typeof generativeSiteSectionSchema>;
export type GenerativeSiteVariant = z.infer<typeof generativeSiteVariantSchema>;
export type GenerativeSiteBundle = z.infer<typeof generativeSiteBundleSchema>;

export const demoSectionStyleOverrideSchema = z.object({
  backgroundColor: hexColorSchema,
  textColor: hexColorSchema,
});

export const demoPresentationOverridesSchema = z
  .object({
    visualDirection: z.enum(generativeDirections).optional(),
    themeId: z.string().trim().min(1).max(80).optional(),
    fontId: z.string().trim().min(1).max(80).optional(),
    sectionStyles: z
      .record(z.string().trim().min(1).max(80), demoSectionStyleOverrideSchema)
      .default({}),
    imageAssignments: z
      .record(z.string().trim().min(1).max(100), z.enum(generativeMediaSlots))
      .default({}),
  })
  .transform((presentation) => ({
    ...presentation,
    sectionStyles: Object.fromEntries(
      Object.entries(presentation.sectionStyles).map(([sectionId, style]) => [
        sectionId,
        {
          backgroundColor: style.backgroundColor.toUpperCase(),
          textColor: closestReadableColor(style.textColor, style.backgroundColor),
        },
      ]),
    ),
  }));

export type DemoSectionStyleOverride = z.infer<typeof demoSectionStyleOverrideSchema>;
export type DemoPresentationOverrides = z.infer<typeof demoPresentationOverridesSchema>;

export function colorContrast(first: string, second: string) {
  return contrastRatio(first, second);
}

export function readableTextColor(background: string, preferred: string) {
  return closestReadableColor(preferred, background);
}

/** Guarantees readable model-selected colors before they reach the DOM. */
export function enforceGenerativeContrast(bundle: GenerativeSiteBundle): GenerativeSiteBundle {
  return {
    ...bundle,
    variants: bundle.variants.map((variant) => ({
      ...variant,
      palette: repairGeneratedPalette(variant.palette as GeneratedPalette),
    })),
  };
}

export function validateGenerativeSiteBundle(value: unknown): GenerativeSiteBundle {
  return enforceGenerativeContrast(generativeSiteBundleSchema.parse(value));
}
