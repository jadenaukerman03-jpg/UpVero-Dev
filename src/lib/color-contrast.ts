export const WCAG_CONTRAST = {
  normalText: 4.5,
  largeText: 3,
  ui: 3,
} as const;

export type RgbaColor = { red: number; green: number; blue: number; alpha: number };

export type BackgroundLayers = {
  backgroundColor?: string | undefined;
  backgroundImage?: string | undefined;
  overlayColor?: string | undefined;
  inheritedBackgrounds?: string[] | undefined;
};

export type ResolvedBackground = {
  color: string;
  hasImage: boolean;
  hasGradient: boolean;
  hasTransparency: boolean;
  inherited: boolean;
  requiresOverlay: boolean;
};

export type GeneratedPalette = {
  background: string;
  surface: string;
  surfaceText: string;
  text: string;
  mutedText: string;
  contrast: string;
  contrastText: string;
  accent: string;
  accentText: string;
};

export type SemanticThemeTokens = {
  pageBackground: string;
  surfaceBackground: string;
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  buttonBackground: string;
  buttonText: string;
  buttonHoverBackground: string;
  buttonHoverText: string;
  linkText: string;
  borderColor: string;
  focusIndicator: string;
  disabledBackground: string;
  disabledText: string;
  contrastBackground: string;
  contrastPrimaryText: string;
  contrastMutedText: string;
  contrastSurface: string;
  contrastSurfaceText: string;
  contrastButtonBackground: string;
  contrastButtonText: string;
  accentBackground: string;
  accentPrimaryText: string;
  accentMutedText: string;
  accentSurface: string;
  accentSurfaceText: string;
  accentButtonBackground: string;
  accentButtonText: string;
  mediaOverlay: string;
  mediaText: string;
};

const WHITE = "#FFFFFF";
const NEAR_BLACK = "#000000";

function clamp(value: number, minimum = 0, maximum = 255) {
  return Math.min(maximum, Math.max(minimum, value));
}

function hslToRgb(hue: number, saturation: number, lightness: number): RgbaColor {
  const h = ((hue % 360) + 360) % 360;
  const s = clamp(saturation, 0, 100) / 100;
  const l = clamp(lightness, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const offset = l - chroma / 2;
  const [red, green, blue] =
    h < 60
      ? [chroma, x, 0]
      : h < 120
        ? [x, chroma, 0]
        : h < 180
          ? [0, chroma, x]
          : h < 240
            ? [0, x, chroma]
            : h < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return {
    red: Math.round((red + offset) * 255),
    green: Math.round((green + offset) * 255),
    blue: Math.round((blue + offset) * 255),
    alpha: 1,
  };
}

function numericChannel(value: string) {
  return value.endsWith("%")
    ? Math.round((clamp(Number.parseFloat(value), 0, 100) / 100) * 255)
    : clamp(Number.parseFloat(value));
}

/** Parses the CSS colors accepted by generated theme controls without evaluating CSS. */
export function parseCssColor(value: string): RgbaColor | undefined {
  const color = value.trim().toLowerCase();
  if (color === "transparent") return { red: 0, green: 0, blue: 0, alpha: 0 };
  const hex = color.match(/^#([\da-f]{3,8})$/i)?.[1];
  if (hex) {
    const expanded =
      hex.length <= 4 ? [...hex].map((character) => character.repeat(2)).join("") : hex;
    if (expanded.length !== 6 && expanded.length !== 8) return undefined;
    return {
      red: Number.parseInt(expanded.slice(0, 2), 16),
      green: Number.parseInt(expanded.slice(2, 4), 16),
      blue: Number.parseInt(expanded.slice(4, 6), 16),
      alpha: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
    };
  }

  const rgb = color.match(/^rgba?\((.+)\)$/)?.[1];
  if (rgb) {
    const [channels, alphaPart] = rgb.split("/").map((part) => part.trim());
    const parts = channels!.split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3) return undefined;
    const commaAlpha = parts[3];
    const alphaValue = alphaPart ?? commaAlpha;
    return {
      red: numericChannel(parts[0]!),
      green: numericChannel(parts[1]!),
      blue: numericChannel(parts[2]!),
      alpha: alphaValue
        ? clamp(Number.parseFloat(alphaValue), 0, alphaValue.endsWith("%") ? 100 : 1) /
          (alphaValue.endsWith("%") ? 100 : 1)
        : 1,
    };
  }

  const hsl = color.match(/^hsla?\((.+)\)$/)?.[1];
  if (hsl) {
    const [channels, alphaPart] = hsl.split("/").map((part) => part.trim());
    const parts = channels!.split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3) return undefined;
    const result = hslToRgb(
      Number.parseFloat(parts[0]!),
      Number.parseFloat(parts[1]!),
      Number.parseFloat(parts[2]!),
    );
    const alphaValue = alphaPart ?? parts[3];
    if (alphaValue) {
      result.alpha = alphaValue.endsWith("%")
        ? clamp(Number.parseFloat(alphaValue), 0, 100) / 100
        : clamp(Number.parseFloat(alphaValue), 0, 1);
    }
    return result;
  }
  return undefined;
}

export function compositeColors(foreground: RgbaColor, background: RgbaColor): RgbaColor {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  return {
    red: Math.round(
      (foreground.red * foreground.alpha +
        background.red * background.alpha * (1 - foreground.alpha)) /
        alpha,
    ),
    green: Math.round(
      (foreground.green * foreground.alpha +
        background.green * background.alpha * (1 - foreground.alpha)) /
        alpha,
    ),
    blue: Math.round(
      (foreground.blue * foreground.alpha +
        background.blue * background.alpha * (1 - foreground.alpha)) /
        alpha,
    ),
    alpha,
  };
}

export function colorToHex(color: RgbaColor) {
  const channel = (value: number) => Math.round(clamp(value)).toString(16).padStart(2, "0");
  return `#${channel(color.red)}${channel(color.green)}${channel(color.blue)}`.toUpperCase();
}

function opaqueColor(value: string, background = WHITE) {
  const parsed = parseCssColor(value);
  const backdrop = parseCssColor(background) ?? parseCssColor(WHITE)!;
  if (!parsed) return backdrop;
  return parsed.alpha < 1 ? compositeColors(parsed, backdrop) : parsed;
}

function luminance(color: RgbaColor) {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.red) + 0.7152 * channel(color.green) + 0.0722 * channel(color.blue);
}

/** Returns the WCAG contrast ratio after alpha-compositing the foreground. */
export function contrastRatio(foreground: string, background: string) {
  const opaqueBackground = opaqueColor(background);
  const parsedForeground = parseCssColor(foreground) ?? parseCssColor(NEAR_BLACK)!;
  const opaqueForeground =
    parsedForeground.alpha < 1
      ? compositeColors(parsedForeground, opaqueBackground)
      : parsedForeground;
  const lighter = Math.max(luminance(opaqueForeground), luminance(opaqueBackground));
  const darker = Math.min(luminance(opaqueForeground), luminance(opaqueBackground));
  return (lighter + 0.05) / (darker + 0.05);
}

function mixColors(from: RgbaColor, to: RgbaColor, amount: number): RgbaColor {
  return {
    red: from.red + (to.red - from.red) * amount,
    green: from.green + (to.green - from.green) * amount,
    blue: from.blue + (to.blue - from.blue) * amount,
    alpha: 1,
  };
}

function readableMix(background: string, preferred: RgbaColor, target: string, minimum: number) {
  const targetColor = opaqueColor(target);
  if (contrastRatio(colorToHex(targetColor), background) < minimum) return undefined;
  let low = 0;
  let high = 1;
  for (let index = 0; index < 18; index += 1) {
    const middle = (low + high) / 2;
    const candidate = colorToHex(mixColors(preferred, targetColor, middle));
    if (contrastRatio(candidate, background) >= minimum) high = middle;
    else low = middle;
  }
  let safeAmount = high;
  let color = colorToHex(mixColors(preferred, targetColor, safeAmount));
  while (contrastRatio(color, background) < minimum && safeAmount < 1) {
    safeAmount = Math.min(1, safeAmount + 0.002);
    color = colorToHex(mixColors(preferred, targetColor, safeAmount));
  }
  return { amount: safeAmount, color };
}

/** Preserves the preferred hue as far as WCAG allows, then uses black/white as the safe fallback. */
export function closestReadableColor(
  foreground: string,
  background: string,
  minimum: number = WCAG_CONTRAST.normalText,
) {
  const opaqueBackground = colorToHex(opaqueColor(background));
  const preferred = opaqueColor(foreground, opaqueBackground);
  const preferredHex = colorToHex(preferred);
  if (contrastRatio(preferredHex, opaqueBackground) >= minimum) return preferredHex;
  const towardWhite = readableMix(opaqueBackground, preferred, WHITE, minimum);
  const towardBlack = readableMix(opaqueBackground, preferred, NEAR_BLACK, minimum);
  if (towardWhite && towardBlack)
    return towardWhite.amount <= towardBlack.amount ? towardWhite.color : towardBlack.color;
  if (towardWhite) return towardWhite.color;
  if (towardBlack) return towardBlack.color;
  return contrastRatio(WHITE, opaqueBackground) >= contrastRatio(NEAR_BLACK, opaqueBackground)
    ? WHITE
    : NEAR_BLACK;
}

export function resolveBackgroundLayers(layers: BackgroundLayers): ResolvedBackground {
  const backgroundImage = layers.backgroundImage?.trim().toLowerCase() ?? "";
  const hasImage = /url\(/.test(backgroundImage);
  const hasGradient = /(?:linear|radial|conic)-gradient\(/.test(backgroundImage);
  const inherited = [layers.backgroundColor, ...(layers.inheritedBackgrounds ?? [])]
    .filter((candidate): candidate is string => Boolean(candidate))
    .map(parseCssColor)
    .find((candidate) => candidate && candidate.alpha > 0);
  const base = inherited ?? parseCssColor(WHITE)!;
  const overlay = layers.overlayColor ? parseCssColor(layers.overlayColor) : undefined;
  const effective = overlay ? compositeColors(overlay, base) : base;
  return {
    color: colorToHex(effective),
    hasImage,
    hasGradient,
    hasTransparency: base.alpha < 1 || Boolean(overlay && overlay.alpha < 1),
    inherited: !parseCssColor(layers.backgroundColor ?? "")?.alpha,
    requiresOverlay: (hasImage || hasGradient) && (!overlay || overlay.alpha < 0.7),
  };
}

/** A dark media veil is deterministic against both the lightest and darkest possible pixels. */
export function mediaContrast() {
  return { overlay: "rgba(0, 0, 0, 0.76)", text: WHITE } as const;
}

function shiftedSurface(background: string, preferred: string, foreground: string) {
  const surface = closestReadableColor(preferred, background, WCAG_CONTRAST.ui);
  return {
    background: surface,
    text: closestReadableColor(foreground, surface, WCAG_CONTRAST.normalText),
  };
}

/** Converts model-selected colors into the only semantic colors the renderer is allowed to use. */
export function createSemanticThemeTokens(palette: GeneratedPalette): SemanticThemeTokens {
  const pageBackground = colorToHex(opaqueColor(palette.background));
  const surfaceBackground = colorToHex(opaqueColor(palette.surface, pageBackground));
  const primaryText = closestReadableColor(palette.text, pageBackground);
  const secondaryText = closestReadableColor(palette.mutedText, pageBackground);
  const contrastBackground = colorToHex(opaqueColor(palette.contrast, pageBackground));
  const accentBackground = closestReadableColor(palette.accent, pageBackground, WCAG_CONTRAST.ui);
  const contrastSurface = shiftedSurface(contrastBackground, palette.surface, palette.contrastText);
  const accentSurface = shiftedSurface(accentBackground, palette.surface, palette.accentText);
  const buttonBackground = accentBackground;
  const hoverSeed =
    contrastRatio(NEAR_BLACK, buttonBackground) > contrastRatio(WHITE, buttonBackground)
      ? NEAR_BLACK
      : WHITE;
  const buttonHoverBackground = closestReadableColor(
    colorToHex(mixColors(opaqueColor(buttonBackground), opaqueColor(hoverSeed), 0.16)),
    pageBackground,
    WCAG_CONTRAST.ui,
  );
  const borderColor = closestReadableColor(palette.mutedText, pageBackground, WCAG_CONTRAST.ui);
  const disabledBackground = closestReadableColor(
    palette.surface,
    pageBackground,
    WCAG_CONTRAST.ui,
  );
  const media = mediaContrast();

  return {
    pageBackground,
    surfaceBackground,
    primaryText,
    secondaryText,
    mutedText: secondaryText,
    buttonBackground,
    buttonText: closestReadableColor(palette.accentText, buttonBackground),
    buttonHoverBackground,
    buttonHoverText: closestReadableColor(palette.accentText, buttonHoverBackground),
    linkText: closestReadableColor(palette.accent, pageBackground),
    borderColor,
    focusIndicator: closestReadableColor(palette.accent, pageBackground, WCAG_CONTRAST.ui),
    disabledBackground,
    disabledText: closestReadableColor(palette.mutedText, disabledBackground),
    contrastBackground,
    contrastPrimaryText: closestReadableColor(palette.contrastText, contrastBackground),
    contrastMutedText: closestReadableColor(palette.contrastText, contrastBackground),
    contrastSurface: contrastSurface.background,
    contrastSurfaceText: contrastSurface.text,
    contrastButtonBackground: contrastSurface.background,
    contrastButtonText: contrastSurface.text,
    accentBackground,
    accentPrimaryText: closestReadableColor(palette.accentText, accentBackground),
    accentMutedText: closestReadableColor(palette.accentText, accentBackground),
    accentSurface: accentSurface.background,
    accentSurfaceText: accentSurface.text,
    accentButtonBackground: accentSurface.background,
    accentButtonText: accentSurface.text,
    mediaOverlay: media.overlay,
    mediaText: media.text,
  };
}

export function repairGeneratedPalette(palette: GeneratedPalette): GeneratedPalette {
  const tokens = createSemanticThemeTokens(palette);
  return {
    background: tokens.pageBackground,
    surface: tokens.surfaceBackground,
    surfaceText: closestReadableColor(palette.surfaceText, tokens.surfaceBackground),
    text: tokens.primaryText,
    mutedText: tokens.mutedText,
    contrast: tokens.contrastBackground,
    contrastText: tokens.contrastPrimaryText,
    accent: tokens.accentBackground,
    accentText: tokens.accentPrimaryText,
  };
}
