export type PreviewRenderAudit = {
  viewport: { width: number; height: number };
  sectionGaps: Array<{ before: string; after: string; pixels: number }>;
  lowContrast: Array<{ text: string; ratio: number }>;
  horizontalOverflow: number;
};

function rgba(value: string): [number, number, number, number] | undefined {
  const values = value.match(/[\d.]+/g)?.map(Number);
  if (!values || values.length < 3) return undefined;
  return [values[0]!, values[1]!, values[2]!, values[3] ?? 1];
}

function luminance([red, green, blue]: [number, number, number, number]) {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function opaqueBackground(element: Element): [number, number, number, number] {
  let current: Element | null = element;
  while (current) {
    const color = rgba(getComputedStyle(current).backgroundColor);
    if (color && color[3] >= 0.95) return color;
    current = current.parentElement;
  }
  return [255, 255, 255, 1];
}

function contrastRatio(
  foreground: [number, number, number, number],
  background: [number, number, number, number],
) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
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
  const lowContrast = Array.from(root.querySelectorAll("h1, h2, h3, p, a, button, label"))
    .slice(0, 240)
    .flatMap((element) => {
      const style = getComputedStyle(element);
      const foreground = rgba(style.color);
      const text = element.textContent?.trim().replace(/\s+/g, " ").slice(0, 160);
      if (!foreground || !text || style.visibility === "hidden" || style.display === "none")
        return [];
      const ratio = contrastRatio(foreground, opaqueBackground(element));
      return ratio < 3.5 ? [{ text, ratio: Number(ratio.toFixed(2)) }] : [];
    })
    .slice(0, 30);
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    sectionGaps: sectionGaps.slice(0, 30),
    lowContrast,
    horizontalOverflow: Math.max(0, Math.round(root.scrollWidth - root.clientWidth)),
  };
}
