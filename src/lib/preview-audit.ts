import {
  closestReadableColor,
  colorToHex,
  compositeColors,
  contrastRatio,
  parseCssColor,
  resolveBackgroundLayers,
  WCAG_CONTRAST,
  type RgbaColor,
} from "./color-contrast";

export type PreviewRenderAudit = {
  viewport: { width: number; height: number };
  sectionGaps: Array<{ before: string; after: string; pixels: number }>;
  lowContrast: Array<{ text: string; ratio: number }>;
  horizontalOverflow: number;
};

export type ContrastAuditFailure = {
  element: string;
  text: string;
  foreground: string;
  background: string;
  ratio: number;
  requiredRatio: number;
  correctedForeground: string;
  backgroundKind: "solid" | "transparent" | "gradient" | "image";
};

function elementLabel(element: Element, index: number) {
  const classes = element.getAttribute("class")?.split(" ").filter(Boolean).slice(0, 3).join(".");
  return element.id
    ? `#${element.id}`
    : `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}:nth(${index + 1})`;
}

function opaqueBackground(element: Element) {
  const ancestors: Element[] = [];
  let current: Element | null = element;
  while (current) {
    ancestors.unshift(current);
    current = current.parentElement;
  }

  let composite: RgbaColor = { red: 255, green: 255, blue: 255, alpha: 1 };
  let hasImage = false;
  let hasGradient = false;
  let hasTransparency = false;
  for (const ancestor of ancestors) {
    const style = getComputedStyle(ancestor);
    const resolved = resolveBackgroundLayers({
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
    });
    hasImage ||= resolved.hasImage;
    hasGradient ||= resolved.hasGradient;
    const color = parseCssColor(style.backgroundColor);
    if (!color || color.alpha === 0) continue;
    hasTransparency ||= color.alpha < 1;
    composite = compositeColors(color, composite);
  }

  const artwork = element.closest(".gs-artwork");
  if (artwork && (hasImage || artwork.querySelector("img"))) {
    const overlay = getComputedStyle(artwork).getPropertyValue("--gs-media-overlay").trim();
    const overlayColor = parseCssColor(overlay);
    if (overlayColor) composite = compositeColors(overlayColor, composite);
    hasImage = true;
  }
  return {
    color: colorToHex(composite),
    kind: hasImage
      ? ("image" as const)
      : hasGradient
        ? ("gradient" as const)
        : hasTransparency
          ? ("transparent" as const)
          : ("solid" as const),
  };
}

function minimumFor(element: Element, style: CSSStyleDeclaration) {
  const isUi = element.matches(
    "button, input, select, textarea, [role='button'], [role='checkbox'], [role='radio'], svg",
  );
  if (isUi) return WCAG_CONTRAST.ui;
  const size = Number.parseFloat(style.fontSize);
  const weight = Number.parseInt(style.fontWeight, 10) || 400;
  const isLarge = size >= 24 || (size >= 18.66 && weight >= 700);
  return isLarge ? WCAG_CONTRAST.largeText : WCAG_CONTRAST.normalText;
}

/** Development-only computed-style audit for rendered generated websites. */
export function auditGeneratedContrast(root: HTMLElement): ContrastAuditFailure[] {
  return Array.from(
    root.querySelectorAll(
      "h1, h2, h3, p, a, button, label, input, select, textarea, summary, dt, dd, figcaption, svg",
    ),
  )
    .slice(0, 500)
    .flatMap((element, index) => {
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0)
        return [];
      const foreground = parseCssColor(style.color);
      const text =
        element instanceof SVGElement
          ? element.getAttribute("aria-label") || "icon"
          : element.textContent?.trim().replace(/\s+/g, " ").slice(0, 160);
      if (!foreground || !text) return [];
      const background = opaqueBackground(element);
      const backgroundColor = parseCssColor(background.color)!;
      const foregroundHex = colorToHex(
        foreground.alpha < 1 ? compositeColors(foreground, backgroundColor) : foreground,
      );
      const ratio = contrastRatio(foregroundHex, background.color);
      const requiredRatio = minimumFor(element, style);
      if (ratio >= requiredRatio) return [];
      return [
        {
          element: elementLabel(element, index),
          text,
          foreground: foregroundHex,
          background: background.color,
          ratio: Number(ratio.toFixed(2)),
          requiredRatio,
          correctedForeground: closestReadableColor(foregroundHex, background.color, requiredRatio),
          backgroundKind: background.kind,
        } satisfies ContrastAuditFailure,
      ];
    });
}

export function logContrastAuditInDevelopment(root: HTMLElement) {
  if (!import.meta.env.DEV) return;
  const failures = auditGeneratedContrast(root);
  if (failures.length) console.table(failures);
  else console.info("UpVero contrast audit: all inspected generated-site combinations pass.");
}

function label(element: Element, index: number) {
  return (
    element.id ||
    element.getAttribute("class")?.split(" ").filter(Boolean).slice(0, 2).join(".") ||
    `section-${index + 1}`
  );
}

/** Compact, privacy-safe measurements for server-side final-polish review. */
export function collectPreviewAudit(root: HTMLElement): PreviewRenderAudit {
  const sections = Array.from(
    root.querySelectorAll(
      ".generated-site > section, .generated-site > main > section, .gs-section, .gs-hero",
    ),
  );
  const uniqueSections = [...new Set(sections)];
  const sectionGaps = uniqueSections.slice(1).flatMap((section, index) => {
    const previous = uniqueSections[index]!;
    const gap = Math.max(
      0,
      Math.round(section.getBoundingClientRect().top - previous.getBoundingClientRect().bottom),
    );
    return gap > 180
      ? [{ before: label(previous, index), after: label(section, index + 1), pixels: gap }]
      : [];
  });
  const lowContrast = auditGeneratedContrast(root)
    .map(({ text, ratio }) => ({ text, ratio }))
    .slice(0, 30);
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    sectionGaps: sectionGaps.slice(0, 30),
    lowContrast,
    horizontalOverflow: Math.max(0, Math.round(root.scrollWidth - root.clientWidth)),
  };
}
