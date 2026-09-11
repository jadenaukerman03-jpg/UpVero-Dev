import { z } from "zod";

import { safeHttpsUrlSchema, safeLinkHrefSchema } from "@/lib/safe-url";
import { repairGeneratedPalette, type GeneratedPalette } from "@/lib/color-contrast";

export const generationStageNames = [
  "research",
  "strategy",
  "information-architecture",
  "art-direction",
  "copy",
  "layout-composition",
  "image-selection",
  "specification-validation",
  "technical-qa",
  "visual-evaluation",
  "repair",
] as const;
export type GenerationStageName = (typeof generationStageNames)[number];

export const factProvenanceSchema = z.enum([
  "user-supplied",
  "publicly-verified",
  "reasonable-inference",
  "unknown",
]);

export const researchFactSchema = z.object({
  field: z.string().trim().min(1).max(80),
  value: z.string().trim().max(2_000),
  provenance: factProvenanceSchema,
  confidence: z.number().min(0).max(1),
  sourceUrl: safeHttpsUrlSchema.optional(),
  evidence: z.string().trim().max(1_000).optional(),
});

export const researchPacketSchema = z.object({
  businessSummary: z.string().trim().min(1).max(2_000),
  facts: z.array(researchFactSchema).max(80),
  missingInformation: z.array(z.string().trim().min(1).max(160)).max(30),
  reasonableInferences: z.array(z.string().trim().min(1).max(300)).max(20),
  completeness: z.number().min(0).max(100),
});

export const websiteStrategySchema = z.object({
  targetAudiences: z.array(z.string().trim().min(1).max(200)).min(1).max(6),
  primaryConversionObjective: z.string().trim().min(1).max(300),
  secondaryObjectives: z.array(z.string().trim().min(1).max(240)).max(5),
  customerConcerns: z.array(z.string().trim().min(1).max(240)).min(1).max(10),
  valueProposition: z.string().trim().min(1).max(400),
  voicePrinciples: z.array(z.string().trim().min(1).max(160)).min(2).max(6),
  trustPlan: z.array(z.string().trim().min(1).max(240)).max(8),
  conversionJourney: z.array(z.string().trim().min(1).max(240)).min(3).max(8),
  contentRisks: z.array(z.string().trim().min(1).max(240)).max(8),
});

export const sectionPurposeSchema = z.enum([
  "hero",
  "offer",
  "explanation",
  "comparison",
  "process",
  "work-sample",
  "trust",
  "faq",
  "contact",
  "conversion",
]);

export const informationArchitectureSchema = z.object({
  rationale: z.string().trim().min(1).max(1_500),
  pages: z
    .array(
      z.object({
        id: z
          .string()
          .trim()
          .regex(/^[a-z0-9-]{2,50}$/),
        path: z
          .string()
          .trim()
          .regex(/^\/[a-z0-9\-/]*$/),
        navigationLabel: z.string().trim().min(1).max(50),
        title: z.string().trim().min(1).max(120),
        purpose: z.string().trim().min(1).max(300),
        conversionObjective: z.string().trim().min(1).max(240),
        sectionPlan: z
          .array(
            z.object({
              id: z
                .string()
                .trim()
                .regex(/^[a-z0-9-]{2,60}$/),
              purpose: sectionPurposeSchema,
              job: z.string().trim().min(1).max(300),
              reasonForPosition: z.string().trim().min(1).max(300),
            }),
          )
          .min(3)
          .max(14),
      }),
    )
    .min(1)
    .max(8),
});

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const fontFamilySchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9\s"',-]+$/, "Use a safe font-family stack.");
const shadowSchema = z
  .string()
  .trim()
  .max(160)
  .refine((value) => !/[;{}]|url\(|var\(/i.test(value), "Use a static, safe box shadow.");

export const designSystemSchema = z.object({
  conceptName: z.string().trim().min(2).max(100),
  rationale: z.string().trim().min(20).max(1_500),
  desiredResponse: z.string().trim().min(1).max(300),
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
  typography: z.object({
    displayFamily: fontFamilySchema,
    headingFamily: fontFamilySchema,
    bodyFamily: fontFamilySchema,
    labelFamily: fontFamilySchema,
    displayWeight: z.number().int().min(300).max(900),
    headingWeight: z.number().int().min(300).max(900),
    bodyWeight: z.number().int().min(300).max(700),
    letterSpacingEm: z.number().min(-0.08).max(0.15),
    bodyLineHeight: z.number().min(1.35).max(1.9),
  }),
  spacing: z.object({
    basePx: z.number().int().min(4).max(12),
    sectionMinPx: z.number().int().min(40).max(140),
    sectionMaxPx: z.number().int().min(64).max(220),
    contentGapPx: z.number().int().min(12).max(64),
    maxContentWidthPx: z.number().int().min(960).max(1600),
    maxReadingWidthCh: z.number().int().min(42).max(78),
  }),
  surfaces: z.object({
    radiusPx: z.number().int().min(0).max(48),
    borderWidthPx: z.number().int().min(0).max(3),
    shadow: shadowSchema,
  }),
  imagery: z.object({
    direction: z.string().trim().min(1).max(500),
    cropBehavior: z.enum(["documentary", "architectural", "editorial", "product-focused"]),
    cornerTreatment: z.enum(["square", "subtle", "rounded", "organic"]),
    overlayOpacity: z.number().min(0.7).max(0.92),
  }),
  motion: z.object({
    philosophy: z.string().trim().min(1).max(300),
    durationMs: z.number().int().min(120).max(900),
    distancePx: z.number().int().min(0).max(40),
    staggerMs: z.number().int().min(0).max(180),
  }),
});

export const copyBlockSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,80}$/),
  eyebrow: z.string().trim().max(80),
  heading: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(1_200),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        body: z.string().trim().min(1).max(500),
        meta: z.string().trim().max(100),
      }),
    )
    .max(8),
  cta: z.object({ label: z.string().trim().min(1).max(70), href: safeLinkHrefSchema }).optional(),
});

export const copyDeckSchema = z.object({
  brandTagline: z.string().trim().min(1).max(140),
  seoTitle: z.string().trim().min(1).max(120),
  seoDescription: z.string().trim().min(1).max(320),
  blocks: z.array(copyBlockSchema).min(3).max(80),
  claimAudit: z.array(z.string().trim().min(1).max(300)).max(20),
});

export const sectionCompositionSchema = z.object({
  sectionId: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,80}$/),
  minHeightVh: z.number().int().min(0).max(100),
  columns: z.number().int().min(1).max(12),
  contentSpan: z.number().int().min(1).max(12),
  mediaSpan: z.number().int().min(0).max(12),
  contentOrder: z.number().int().min(1).max(4),
  mediaOrder: z.number().int().min(1).max(4),
  align: z.enum(["start", "center", "end", "stretch"]),
  textAlign: z.enum(["left", "center", "right"]),
  itemColumns: z.number().int().min(1).max(4),
  itemTreatment: z.enum(["plain", "bordered", "elevated", "divided", "numbered"]),
  tone: z.enum(["base", "surface", "contrast", "accent"]),
  mediaPlacement: z.enum(["none", "before", "after", "background", "interleaved"]),
  mobileOrder: z.enum(["content-first", "media-first"]),
  decorativeMotif: z.string().trim().max(200),
  rationale: z.string().trim().min(1).max(400),
});

export const layoutCompositionSchema = z.object({
  rationale: z.string().trim().min(20).max(1_500),
  pages: z
    .array(
      z.object({
        pageId: z
          .string()
          .trim()
          .regex(/^[a-z0-9-]{2,50}$/),
        sections: z.array(sectionCompositionSchema).min(3).max(14),
      }),
    )
    .min(1)
    .max(8),
});

export const mediaPlanSchema = z.object({
  assets: z
    .array(
      z.object({
        id: z
          .string()
          .trim()
          .regex(/^[a-z0-9-]{2,80}$/),
        sectionId: z
          .string()
          .trim()
          .regex(/^[a-z0-9-]{2,80}$/),
        purpose: z.string().trim().min(1).max(300),
        query: z.string().trim().min(2).max(300),
        alt: z.string().trim().min(1).max(240),
        aspectRatio: z.enum(["21:9", "16:9", "4:3", "3:2", "1:1", "4:5", "3:4"]),
        focalPoint: z.enum(["center", "left", "right", "top", "bottom"]),
        sourceUrl: safeHttpsUrlSchema.optional(),
        imageUrl: safeHttpsUrlSchema.optional(),
        provider: z.string().trim().max(80).optional(),
        attribution: z.string().trim().max(200).optional(),
      }),
    )
    .max(40),
});

export const designRationaleSchema = z.object({
  structureRationale: z.string().trim().min(20).max(1_500),
  sectionOrderRationale: z.string().trim().min(20).max(1_500),
  businessFit: z.string().trim().min(20).max(1_500),
  visualResponseRationale: z.string().trim().min(20).max(1_500),
  differentiation: z.string().trim().min(20).max(1_500),
});

export const siteSpecV3Schema = z
  .object({
    schemaVersion: z.literal(3),
    engine: z.literal("upvero-generative-v3"),
    research: researchPacketSchema,
    strategy: websiteStrategySchema,
    architecture: informationArchitectureSchema,
    designSystem: designSystemSchema,
    copy: copyDeckSchema,
    composition: layoutCompositionSchema,
    media: mediaPlanSchema,
    rationale: designRationaleSchema,
    originality: z.object({
      fingerprint: z.string().trim().min(16).max(128),
      comparedAgainst: z.number().int().nonnegative(),
      maximumSimilarity: z.number().min(0).max(1),
      distinctiveCharacteristics: z.array(z.string().trim().min(1).max(240)).min(3).max(12),
    }),
    quality: z.object({
      status: z.enum(["pending", "passed", "failed"]),
      score: z.number().min(0).max(100),
      repairIterations: z.number().int().min(0).max(3),
      defects: z.array(z.string().trim().min(1).max(500)).max(50),
    }),
  })
  .superRefine((spec, context) => {
    const pageIds = new Set(spec.architecture.pages.map((page) => page.id));
    const allSectionIds = spec.architecture.pages.flatMap((page) =>
      page.sectionPlan.map((section) => section.id),
    );
    const compositionPageIds = new Set(spec.composition.pages.map((page) => page.pageId));
    if (pageIds.size !== spec.architecture.pages.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["architecture", "pages"],
        message: "Page ids must be unique.",
      });
    }
    if (new Set(allSectionIds).size !== allSectionIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["architecture", "pages"],
        message: "Section ids must be unique across the entire site.",
      });
    }
    for (const page of spec.architecture.pages) {
      if (!compositionPageIds.has(page.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["composition", "pages"],
          message: `Missing composition for ${page.id}.`,
        });
      }
      const sectionIds = new Set(page.sectionPlan.map((section) => section.id));
      const composed = spec.composition.pages.find((candidate) => candidate.pageId === page.id);
      for (const section of composed?.sections ?? []) {
        if (!sectionIds.has(section.sectionId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["composition", "pages"],
            message: `Unknown section ${section.sectionId}.`,
          });
        }
        if (
          section.contentSpan > section.columns ||
          section.mediaSpan > section.columns ||
          (section.mediaPlacement !== "background" &&
            section.mediaPlacement !== "none" &&
            section.contentSpan + section.mediaSpan > section.columns)
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["composition", "pages"],
            message: `Section ${section.sectionId} uses invalid spans.`,
          });
        }
      }
      for (const sectionId of sectionIds) {
        if (!composed?.sections.some((section) => section.sectionId === sectionId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["composition", "pages"],
            message: `Section ${sectionId} is not composed.`,
          });
        }
        if (!spec.copy.blocks.some((block) => block.id === sectionId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["copy", "blocks"],
            message: `Section ${sectionId} has no copy block.`,
          });
        }
      }
    }
    const knownSections = new Set(
      spec.architecture.pages.flatMap((page) => page.sectionPlan.map((section) => section.id)),
    );
    for (const asset of spec.media.assets) {
      if (!knownSections.has(asset.sectionId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["media", "assets"],
          message: `Media asset ${asset.id} references an unknown section.`,
        });
      }
    }
  });

export type ResearchPacket = z.infer<typeof researchPacketSchema>;
export type WebsiteStrategy = z.infer<typeof websiteStrategySchema>;
export type InformationArchitecture = z.infer<typeof informationArchitectureSchema>;
export type GeneratedDesignSystem = z.infer<typeof designSystemSchema>;
export type CopyDeck = z.infer<typeof copyDeckSchema>;
export type LayoutComposition = z.infer<typeof layoutCompositionSchema>;
export type MediaPlan = z.infer<typeof mediaPlanSchema>;
export type SiteSpecV3 = z.infer<typeof siteSpecV3Schema>;

export function validateSiteSpecV3(value: unknown): SiteSpecV3 {
  const parsed = siteSpecV3Schema.parse(value);
  return {
    ...parsed,
    designSystem: {
      ...parsed.designSystem,
      palette: repairGeneratedPalette(parsed.designSystem.palette as GeneratedPalette),
    },
  };
}
