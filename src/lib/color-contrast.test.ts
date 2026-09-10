import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  closestReadableColor,
  compositeColors,
  contrastRatio,
  createSemanticThemeTokens,
  mediaContrast,
  parseCssColor,
  resolveBackgroundLayers,
  WCAG_CONTRAST,
  type GeneratedPalette,
} from "./color-contrast";

const themes: Array<{ name: string; palette: GeneratedPalette }> = [
  {
    name: "light",
    palette: {
      background: "#FAF7F0",
      surface: "#FFFFFF",
      surfaceText: "#EEEAE2",
      text: "#E9E2D7",
      mutedText: "#CFC7BC",
      contrast: "#25282D",
      contrastText: "#4A4C50",
      accent: "#E97842",
      accentText: "#F6C8B1",
    },
  },
  {
    name: "dark",
    palette: {
      background: "#171A20",
      surface: "#222832",
      surfaceText: "#39414D",
      text: "#343941",
      mutedText: "#505865",
      contrast: "#090B0F",
      contrastText: "#30333A",
      accent: "#D25F32",
      accentText: "#8B3D22",
    },
  },
  {
    name: "colorful",
    palette: {
      background: "#E8F4FF",
      surface: "#F8C9DB",
      surfaceText: "#EB9DBC",
      text: "#90BCD9",
      mutedText: "#9CBBD0",
      contrast: "#403D86",
      contrastText: "#736FA8",
      accent: "#FFB72D",
      accentText: "#E2A21F",
    },
  },
];

describe("generated website contrast enforcement", () => {
  for (const theme of themes) {
    test(`repairs all semantic ${theme.name} theme combinations`, () => {
      const tokens = createSemanticThemeTokens(theme.palette);
      const textPairs = [
        [tokens.primaryText, tokens.pageBackground],
        [tokens.secondaryText, tokens.pageBackground],
        [tokens.mutedText, tokens.pageBackground],
        [tokens.buttonText, tokens.buttonBackground],
        [tokens.buttonHoverText, tokens.buttonHoverBackground],
        [tokens.linkText, tokens.pageBackground],
        [tokens.disabledText, tokens.disabledBackground],
        [tokens.contrastPrimaryText, tokens.contrastBackground],
        [tokens.contrastMutedText, tokens.contrastBackground],
        [tokens.contrastSurfaceText, tokens.contrastSurface],
        [tokens.contrastButtonText, tokens.contrastButtonBackground],
        [tokens.accentPrimaryText, tokens.accentBackground],
        [tokens.accentMutedText, tokens.accentBackground],
        [tokens.accentSurfaceText, tokens.accentSurface],
        [tokens.accentButtonText, tokens.accentButtonBackground],
      ];
      for (const [foreground, background] of textPairs)
        assert.ok(
          contrastRatio(foreground!, background!) >= WCAG_CONTRAST.normalText,
          `${foreground} on ${background} must meet normal-text AA`,
        );

      const uiPairs = [
        [tokens.borderColor, tokens.pageBackground],
        [tokens.focusIndicator, tokens.pageBackground],
        [tokens.buttonBackground, tokens.pageBackground],
        [tokens.disabledBackground, tokens.pageBackground],
        [tokens.contrastButtonBackground, tokens.contrastBackground],
        [tokens.accentButtonBackground, tokens.accentBackground],
      ];
      for (const [foreground, background] of uiPairs)
        assert.ok(contrastRatio(foreground!, background!) >= WCAG_CONTRAST.ui);
    });
  }

  test("keeps a preferred hue when a nearby readable correction exists", () => {
    const corrected = closestReadableColor("#B98265", "#F5EDE5");
    assert.notEqual(corrected, "#FFFFFF");
    assert.ok(contrastRatio(corrected, "#F5EDE5") >= WCAG_CONTRAST.normalText);
  });

  test("composites transparent colors before measuring them", () => {
    assert.ok(contrastRatio("rgba(0, 0, 0, 0.55)", "#FFFFFF") >= 4.5);
    assert.ok(contrastRatio("rgba(255, 255, 255, 0.35)", "#FFFFFF") < 4.5);
  });

  test("detects inherited, gradient, and image-backed backgrounds", () => {
    const inherited = resolveBackgroundLayers({
      backgroundColor: "transparent",
      inheritedBackgrounds: ["rgba(0, 0, 0, 0)", "#20242A"],
    });
    assert.equal(inherited.inherited, true);
    assert.equal(inherited.color, "#20242A");

    const gradient = resolveBackgroundLayers({
      backgroundColor: "#F7F7F7",
      backgroundImage: "linear-gradient(#fff, #000)",
    });
    assert.equal(gradient.hasGradient, true);
    assert.equal(gradient.requiresOverlay, true);

    const image = resolveBackgroundLayers({
      backgroundColor: "#FFFFFF",
      backgroundImage: 'url("https://images.example/photo.jpg")',
    });
    assert.equal(image.hasImage, true);
    assert.equal(image.requiresOverlay, true);
  });

  test("media overlay keeps white text readable over the lightest possible photo", () => {
    const media = mediaContrast();
    const effective = compositeColors(parseCssColor(media.overlay)!, parseCssColor("#FFFFFF")!);
    assert.ok(
      contrastRatio(media.text, `rgb(${effective.red}, ${effective.green}, ${effective.blue})`) >=
        WCAG_CONTRAST.normalText,
    );
  });
});
