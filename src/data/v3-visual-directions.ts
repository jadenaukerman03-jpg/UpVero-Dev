import type { DemoVisualDirection } from "./demo-themes";

export type V3VisualDirectionProfile = {
  radiusScale: number;
  sectionScale: number;
  gapScale: number;
  borderWidthPx: number;
  shadow: string;
  displayFamily: string;
  headingFamily: string;
  bodyFamily: string;
  displayWeight: number;
  headingWeight: number;
  letterSpacingEm: number;
  motionScale: number;
};

/**
 * Post-generation art-direction lenses. These never replace the AI-authored
 * page architecture or copy; they transform its design system predictably.
 */
export const v3VisualDirectionProfiles: Record<DemoVisualDirection, V3VisualDirectionProfile> = {
  professional: {
    radiusScale: 0.8,
    sectionScale: 0.96,
    gapScale: 0.95,
    borderWidthPx: 1,
    shadow: "0 18px 45px rgb(15 23 42 / 10%)",
    displayFamily: '"Libre Baskerville", ui-serif, Georgia, serif',
    headingFamily: '"Libre Baskerville", ui-serif, Georgia, serif',
    bodyFamily: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif',
    displayWeight: 700,
    headingWeight: 650,
    letterSpacingEm: -0.025,
    motionScale: 0.85,
  },
  modern: {
    radiusScale: 0.48,
    sectionScale: 0.88,
    gapScale: 0.86,
    borderWidthPx: 1,
    shadow: "0 24px 65px rgb(15 23 42 / 16%)",
    displayFamily: '"Space Grotesk", "Arial Narrow", ui-sans-serif, system-ui, sans-serif',
    headingFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    bodyFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    displayWeight: 750,
    headingWeight: 700,
    letterSpacingEm: -0.045,
    motionScale: 0.72,
  },
  luxury: {
    radiusScale: 0.3,
    sectionScale: 1.08,
    gapScale: 1.12,
    borderWidthPx: 1,
    shadow: "0 28px 80px rgb(18 18 15 / 14%)",
    displayFamily: '"Cormorant Garamond", "Times New Roman", serif',
    headingFamily: '"Cormorant Garamond", "Times New Roman", serif',
    bodyFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    displayWeight: 600,
    headingWeight: 600,
    letterSpacingEm: -0.018,
    motionScale: 1.15,
  },
  friendly: {
    radiusScale: 1.45,
    sectionScale: 0.98,
    gapScale: 1.04,
    borderWidthPx: 1,
    shadow: "0 20px 55px rgb(20 45 35 / 12%)",
    displayFamily: '"Manrope", ui-sans-serif, system-ui, sans-serif',
    headingFamily: '"Manrope", ui-sans-serif, system-ui, sans-serif',
    bodyFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    displayWeight: 750,
    headingWeight: 700,
    letterSpacingEm: -0.035,
    motionScale: 0.9,
  },
  minimal: {
    radiusScale: 0.22,
    sectionScale: 0.78,
    gapScale: 0.72,
    borderWidthPx: 1,
    shadow: "none",
    displayFamily: '"Manrope", ui-sans-serif, system-ui, sans-serif',
    headingFamily: '"Manrope", ui-sans-serif, system-ui, sans-serif',
    bodyFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    displayWeight: 650,
    headingWeight: 600,
    letterSpacingEm: -0.03,
    motionScale: 0.45,
  },
};

export function scaleDirectionValue(
  value: number,
  scale: number,
  minimum: number,
  maximum: number,
) {
  return Math.max(minimum, Math.min(maximum, Math.round(value * scale)));
}
