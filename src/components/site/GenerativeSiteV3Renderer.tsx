import { ArrowUpRight } from "lucide-react";
import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";

import type { SiteConfig } from "@/data/site";
import type { SiteSpecV3 } from "@/generation/contracts/site-spec-v3";
import { createSemanticThemeTokens, type GeneratedPalette } from "@/lib/color-contrast";
import type { DemoPresentationOverrides } from "@/data/generative-site";

import { Contact, type WebsiteLeadCaptureTarget } from "./Contact";

function toneStyle(
  tone: SiteSpecV3["composition"]["pages"][number]["sections"][number]["tone"],
  tokens: ReturnType<typeof createSemanticThemeTokens>,
  surfaceText: string,
) {
  if (tone === "contrast") {
    return {
      backgroundColor: tokens.contrastBackground,
      color: tokens.contrastPrimaryText,
      "--v3-muted": tokens.contrastMutedText,
      "--v3-surface": tokens.contrastSurface,
      "--v3-surface-text": tokens.contrastSurfaceText,
    } as CSSProperties;
  }
  if (tone === "accent") {
    return {
      backgroundColor: tokens.accentBackground,
      color: tokens.accentPrimaryText,
      "--v3-muted": tokens.accentMutedText,
      "--v3-surface": tokens.accentSurface,
      "--v3-surface-text": tokens.accentSurfaceText,
    } as CSSProperties;
  }
  return {
    backgroundColor: tone === "surface" ? tokens.surfaceBackground : tokens.pageBackground,
    color: tone === "surface" ? surfaceText : tokens.primaryText,
    "--v3-muted": tone === "surface" ? surfaceText : tokens.secondaryText,
    "--v3-surface": tokens.surfaceBackground,
    "--v3-surface-text": surfaceText,
  } as CSSProperties;
}

function Media({
  asset,
  radius,
}: {
  asset: SiteSpecV3["media"]["assets"][number] | undefined;
  radius: number;
}) {
  if (!asset?.imageUrl) return null;
  return (
    <figure className="v3-media" style={{ borderRadius: radius }}>
      <img
        src={asset.imageUrl}
        alt={asset.alt}
        loading="lazy"
        style={{ objectPosition: asset.focalPoint }}
      />
      {asset.attribution && asset.sourceUrl ? (
        <figcaption>
          <a href={asset.sourceUrl} rel="noreferrer" target="_blank">
            {asset.attribution}
          </a>
        </figcaption>
      ) : null}
    </figure>
  );
}

export function GenerativeSiteV3Renderer({
  config,
  leadCaptureTarget,
  paletteOverride,
  fontOverride,
  presentationOverrides,
}: {
  config: SiteConfig;
  leadCaptureTarget?: WebsiteLeadCaptureTarget;
  paletteOverride?: GeneratedPalette;
  fontOverride?: { display: string; body: string };
  presentationOverrides?: DemoPresentationOverrides;
}) {
  const spec = config.siteSpecV3!;
  const homePage =
    spec.architecture.pages.find((page) => page.path === "/") ?? spec.architecture.pages[0]!;
  const [activePageId, setActivePageId] = useState(homePage.id);
  const activePage = spec.architecture.pages.find((page) => page.id === activePageId) ?? homePage;
  const tokens = useMemo(
    () => createSemanticThemeTokens(paletteOverride ?? spec.designSystem.palette),
    [paletteOverride, spec.designSystem.palette],
  );
  const style = {
    "--v3-page": tokens.pageBackground,
    "--v3-text": tokens.primaryText,
    "--v3-muted": tokens.mutedText,
    "--v3-accent": tokens.buttonBackground,
    "--v3-accent-text": tokens.buttonText,
    "--v3-border": tokens.borderColor,
    "--v3-focus": tokens.focusIndicator,
    "--v3-display": fontOverride?.display ?? spec.designSystem.typography.displayFamily,
    "--v3-heading": fontOverride?.display ?? spec.designSystem.typography.headingFamily,
    "--v3-body": fontOverride?.body ?? spec.designSystem.typography.bodyFamily,
    "--v3-label": spec.designSystem.typography.labelFamily,
    "--v3-radius": `${spec.designSystem.surfaces.radiusPx}px`,
    "--v3-border-width": `${spec.designSystem.surfaces.borderWidthPx}px`,
    "--v3-shadow": spec.designSystem.surfaces.shadow,
    "--v3-base": `${spec.designSystem.spacing.basePx}px`,
    "--v3-section-min": `${spec.designSystem.spacing.sectionMinPx}px`,
    "--v3-section-max": `${spec.designSystem.spacing.sectionMaxPx}px`,
    "--v3-gap": `${spec.designSystem.spacing.contentGapPx}px`,
    "--v3-container": `${spec.designSystem.spacing.maxContentWidthPx}px`,
    "--v3-reading": `${spec.designSystem.spacing.maxReadingWidthCh}ch`,
    "--v3-duration": `${spec.designSystem.motion.durationMs}ms`,
    "--v3-distance": `${spec.designSystem.motion.distancePx}px`,
    "--v3-stagger": `${spec.designSystem.motion.staggerMs}ms`,
    "--v3-letter-spacing": `${spec.designSystem.typography.letterSpacingEm}em`,
    "--v3-line-height": spec.designSystem.typography.bodyLineHeight,
  } as CSSProperties;

  function openPage(pageId: string) {
    setActivePageId(pageId);
    requestAnimationFrame(() => document.querySelector(".v3-site")?.scrollIntoView());
  }

  function followInternalLink(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!href.startsWith("#")) return;
    const sectionId = href.slice(1);
    const targetPage = spec.architecture.pages.find((page) =>
      page.sectionPlan.some((section) => section.id === sectionId),
    );
    if (!targetPage || targetPage.id === activePage.id) return;
    event.preventDefault();
    setActivePageId(targetPage.id);
    requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView());
  }

  return (
    <div id="top" className="v3-site" style={style} data-generation-engine={spec.engine}>
      <header className="v3-header">
        <button
          className="v3-brand"
          type="button"
          aria-label={`${config.brand.name} home`}
          onClick={() => openPage(homePage.id)}
        >
          <span aria-hidden="true">{config.brand.shortName}</span>
          {config.brand.name}
        </button>
        <nav aria-label="Primary navigation">
          {spec.architecture.pages.map((page) => (
            <button
              type="button"
              key={page.id}
              onClick={() => openPage(page.id)}
              aria-current={page.id === activePage.id ? "page" : undefined}
            >
              {page.navigationLabel}
            </button>
          ))}
        </nav>
        <a
          className="v3-button"
          href={config.header.primaryCta.href}
          onClick={(event) => followInternalLink(event, config.header.primaryCta.href)}
        >
          {config.header.primaryCta.label}
          <ArrowUpRight aria-hidden="true" />
        </a>
      </header>

      <main>
        {[activePage].map((page) => {
          const composition = spec.composition.pages.find((item) => item.pageId === page.id);
          const isHome = page.id === homePage.id;
          return (
            <article
              id={`page-${page.id}`}
              key={page.id}
              className="v3-page"
              aria-label={page.title}
            >
              {!isHome ? (
                <div className="v3-page-intro">
                  <p>{page.navigationLabel}</p>
                  <h1>{page.title}</h1>
                </div>
              ) : null}
              {page.sectionPlan.map((plannedSection, sectionIndex) => {
                const block = spec.copy.blocks.find((item) => item.id === plannedSection.id);
                const layout = composition?.sections.find(
                  (item) => item.sectionId === plannedSection.id,
                );
                if (!block || !layout) return null;
                const media = spec.media.assets.find(
                  (asset) => asset.sectionId === plannedSection.id,
                );
                const sectionOverride = presentationOverrides?.sectionStyles[plannedSection.id];
                const sectionStyle = {
                  ...toneStyle(layout.tone, tokens, spec.designSystem.palette.surfaceText),
                  ...(sectionOverride
                    ? {
                        backgroundColor: sectionOverride.backgroundColor,
                        color: sectionOverride.textColor,
                        "--v3-muted": sectionOverride.textColor,
                        "--v3-surface-text": sectionOverride.textColor,
                      }
                    : {}),
                  "--v3-columns": layout.columns,
                  "--v3-content-span": layout.contentSpan,
                  "--v3-media-span": Math.max(1, layout.mediaSpan),
                  "--v3-content-order": layout.contentOrder,
                  "--v3-media-order": layout.mediaOrder,
                  "--v3-item-columns": layout.itemColumns,
                  "--v3-min-height": `${layout.minHeightVh}vh`,
                  "--v3-align": layout.align,
                  "--v3-text-align": layout.textAlign,
                  "--v3-delay": `${sectionIndex * spec.designSystem.motion.staggerMs}ms`,
                } as CSSProperties;
                if (plannedSection.purpose === "contact") {
                  return (
                    <div key={plannedSection.id} id={plannedSection.id} className="v3-contact-wrap">
                      <Contact
                        leadCaptureTarget={leadCaptureTarget}
                        content={{
                          eyebrow: block.eyebrow,
                          heading: block.heading,
                          body: block.body,
                        }}
                        presentation={{
                          backgroundColor:
                            layout.tone === "contrast"
                              ? tokens.contrastBackground
                              : tokens.pageBackground,
                          textColor:
                            layout.tone === "contrast"
                              ? tokens.contrastPrimaryText
                              : tokens.primaryText,
                        }}
                      />
                    </div>
                  );
                }
                const isBackgroundMedia = layout.mediaPlacement === "background" && media?.imageUrl;
                return (
                  <section
                    id={plannedSection.id}
                    key={plannedSection.id}
                    className={`v3-section v3-purpose-${plannedSection.purpose} v3-items-${layout.itemTreatment}${isBackgroundMedia ? " v3-has-background-media" : ""}`}
                    style={{
                      ...sectionStyle,
                      ...(isBackgroundMedia ? { backgroundImage: `url("${media.imageUrl}")` } : {}),
                    }}
                    data-mobile-order={layout.mobileOrder}
                  >
                    {isBackgroundMedia ? (
                      <div
                        className="v3-media-overlay"
                        aria-hidden="true"
                        style={{ opacity: spec.designSystem.imagery.overlayOpacity }}
                      />
                    ) : null}
                    <div className="v3-section-grid">
                      <div className="v3-section-copy">
                        {block.eyebrow ? <p className="v3-eyebrow">{block.eyebrow}</p> : null}
                        {plannedSection.purpose === "hero" && isHome ? (
                          <h1>{block.heading}</h1>
                        ) : (
                          <h2>{block.heading}</h2>
                        )}
                        <p className="v3-lede">{block.body}</p>
                        {block.items.length ? (
                          <div className="v3-items">
                            {block.items.map((item, index) =>
                              plannedSection.purpose === "faq" ? (
                                <details key={`${item.title}-${index}`}>
                                  <summary>{item.title}</summary>
                                  <p>{item.body}</p>
                                </details>
                              ) : (
                                <article key={`${item.title}-${index}`}>
                                  {layout.itemTreatment === "numbered" ? (
                                    <span>{String(index + 1).padStart(2, "0")}</span>
                                  ) : null}
                                  <h3>{item.title}</h3>
                                  <p>{item.body}</p>
                                  {item.meta ? <small>{item.meta}</small> : null}
                                </article>
                              ),
                            )}
                          </div>
                        ) : null}
                        {block.cta ? (
                          <a
                            className="v3-button"
                            href={block.cta.href}
                            onClick={(event) => followInternalLink(event, block.cta!.href)}
                          >
                            {block.cta.label}
                            <ArrowUpRight aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                      {!isBackgroundMedia && layout.mediaPlacement !== "none" ? (
                        <Media asset={media} radius={spec.designSystem.surfaces.radiusPx} />
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </article>
          );
        })}
      </main>

      <footer className="v3-footer">
        <strong>{config.brand.name}</strong>
        <span>{spec.copy.brandTagline}</span>
        <small>
          © {new Date().getFullYear()} {config.footer.copyrightSuffix}
        </small>
      </footer>
    </div>
  );
}
