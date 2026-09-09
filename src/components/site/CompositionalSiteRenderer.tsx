import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import type {
  DemoPresentationOverrides,
  GenerativeMediaSlot,
  GenerativeSiteItem,
  GenerativeSiteSection,
  GenerativeSiteVariant,
} from "@/data/generative-site";
import type { SiteConfig } from "@/data/site";
import { useSiteConfig } from "@/data/site-config-context";

import { Contact, type WebsiteLeadCaptureTarget } from "./Contact";

type PreviewFontVariables = {
  "--preview-font-sans": string;
  "--preview-font-display": string;
};

const generatedTypographyVariables: Record<
  GenerativeSiteVariant["typography"],
  PreviewFontVariables
> = {
  "clean-sans": {
    "--preview-font-display": '"Manrope", ui-sans-serif, system-ui, sans-serif',
    "--preview-font-sans": '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  "editorial-serif": {
    "--preview-font-display": '"Cormorant Garamond", ui-serif, Georgia, serif',
    "--preview-font-sans": '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  technical: {
    "--preview-font-display": '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    "--preview-font-sans": '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  },
  humanist: {
    "--preview-font-display": '"Fraunces", ui-serif, Georgia, serif',
    "--preview-font-sans": '"Archivo", ui-sans-serif, system-ui, sans-serif',
  },
  classic: {
    "--preview-font-display": '"Libre Baskerville", ui-serif, Georgia, serif',
    "--preview-font-sans": '"Source Sans 3", ui-sans-serif, system-ui, sans-serif',
  },
};

function assetForSlot(config: SiteConfig, slot: GenerativeMediaSlot) {
  if (slot === "hero") return config.assets.hero;
  if (slot === "about") return config.assets.about;
  if (slot.startsWith("gallery-")) {
    const index = Number(slot.split("-")[1]) - 1;
    return config.assets.gallery?.[index];
  }
  return undefined;
}

function imageCandidates(config: SiteConfig, preferredSlot: GenerativeMediaSlot) {
  const preferred = assetForSlot(config, preferredSlot);
  const candidates = [
    preferred,
    config.assets.hero,
    config.assets.about,
    ...(config.assets.gallery ?? []),
  ].filter((asset): asset is NonNullable<typeof asset> & { src: string } => Boolean(asset?.src));
  return candidates.filter(
    (asset, index) => candidates.findIndex((candidate) => candidate.src === asset.src) === index,
  );
}

function resolvedItems(config: SiteConfig, section: GenerativeSiteSection) {
  const targets: Partial<Record<GenerativeSiteSection["kind"], number>> = {
    offers: 3,
    gallery: 3,
    process: 3,
    faq: 4,
  };
  const target = targets[section.kind] ?? 0;
  if (!target || section.items.length >= target) return section.items;

  let fallbacks: GenerativeSiteItem[] = [];
  if (section.kind === "offers") {
    fallbacks = config.services.items.map((item) => ({
      title: item.title,
      body: item.body,
      meta: item.number,
    }));
  } else if (section.kind === "gallery") {
    fallbacks = (config.story?.showcase.items ?? config.services.items).map((item) => ({
      title: item.title,
      body: item.body,
      meta: "",
    }));
  } else if (section.kind === "process") {
    fallbacks = (config.story?.process.items ?? []).map((item) => ({
      title: item.title,
      body: item.body,
      meta: "",
    }));
  } else if (section.kind === "faq") {
    fallbacks = config.faq.items.map((item) => ({
      title: item.question,
      body: item.answer,
      meta: "",
    }));
  }

  const titles = new Set(section.items.map((item) => item.title.toLowerCase()));
  return [
    ...section.items,
    ...fallbacks.filter((item) => !titles.has(item.title.toLowerCase())),
  ].slice(0, target);
}

function GenerativeArtwork({
  slot,
  section,
  areaId,
  presentationOverrides,
}: {
  slot: GenerativeMediaSlot;
  section: GenerativeSiteSection;
  areaId: string;
  presentationOverrides?: DemoPresentationOverrides | undefined;
}) {
  const config = useSiteConfig();
  const selectedSlot = presentationOverrides?.imageAssignments[areaId] ?? slot;
  const candidates = useMemo(() => imageCandidates(config, selectedSlot), [config, selectedSlot]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  useEffect(() => setCandidateIndex(0), [selectedSlot]);
  const asset = candidates[candidateIndex];
  return (
    <figure className="gs-artwork" data-media={selectedSlot} data-image-area={areaId}>
      {asset?.src ? (
        <img
          src={asset.src}
          alt={asset.alt}
          loading={slot === "hero" ? "eager" : "lazy"}
          onError={() => setCandidateIndex((index) => index + 1)}
        />
      ) : (
        <div className="gs-artwork-fallback" role="img" aria-label={asset?.alt || section.heading}>
          <span>{config.brand.shortName}</span>
        </div>
      )}
      <figcaption>
        <span>{section.eyebrow || config.brand.name}</span>
        <span>{section.heading}</span>
      </figcaption>
    </figure>
  );
}

function SectionIntro({ section }: { section: GenerativeSiteSection }) {
  return (
    <div className="gs-section-intro">
      {section.eyebrow ? <p className="gs-eyebrow">{section.eyebrow}</p> : null}
      <h2>{section.heading}</h2>
      <p>{section.body}</p>
      {section.ctaLabel ? (
        <a className="gs-text-link" href="#contact">
          {section.ctaLabel} <ArrowUpRight aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

function ItemGrid({ section }: { section: GenerativeSiteSection }) {
  const config = useSiteConfig();
  const items = resolvedItems(config, section);
  return (
    <div className="gs-items">
      {items.map((item, index) => (
        <article className="gs-item" key={`${section.id}-${item.title}`}>
          <span className="gs-item-index">{String(index + 1).padStart(2, "0")}</span>
          {item.meta ? <p className="gs-item-meta">{item.meta}</p> : null}
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </article>
      ))}
    </div>
  );
}

function sectionPresentation(id: string, presentationOverrides?: DemoPresentationOverrides) {
  const override = presentationOverrides?.sectionStyles[id];
  if (!override) return {};
  return {
    "data-custom-colors": "true",
    style: {
      backgroundColor: override.backgroundColor,
      color: override.textColor,
      "--gs-section-bg": override.backgroundColor,
      "--gs-section-text": override.textColor,
      "--gs-muted": override.textColor,
    } as CSSProperties,
  };
}

function HeroSection({
  section,
  presentationOverrides,
}: {
  section: GenerativeSiteSection;
  presentationOverrides?: DemoPresentationOverrides | undefined;
}) {
  const config = useSiteConfig();
  const hasMedia = section.mediaSlot !== "none";
  return (
    <section
      id={section.id}
      className="gs-hero"
      data-layout={section.layout}
      data-tone={section.tone}
      {...sectionPresentation(section.id, presentationOverrides)}
    >
      <div className="gs-shell gs-hero-grid">
        <div className="gs-hero-copy">
          <p className="gs-eyebrow">{section.eyebrow || config.brand.tagline}</p>
          <h1>{section.heading}</h1>
          <p className="gs-hero-body">{section.body}</p>
          <div className="gs-hero-actions">
            <a className="gs-primary-button" href="#contact">
              {section.ctaLabel || config.hero.primaryCta.label}
              <ArrowDownRight aria-hidden="true" />
            </a>
            {config.brand.phone ? (
              <a href={`tel:${config.brand.phone}`}>{config.brand.phone}</a>
            ) : null}
          </div>
        </div>
        {hasMedia ? (
          <GenerativeArtwork
            slot={section.mediaSlot}
            section={section}
            areaId={section.id}
            presentationOverrides={presentationOverrides}
          />
        ) : null}
      </div>
    </section>
  );
}

function GallerySection({
  section,
  presentationOverrides,
}: {
  section: GenerativeSiteSection;
  presentationOverrides?: DemoPresentationOverrides | undefined;
}) {
  const config = useSiteConfig();
  const items = resolvedItems(config, section);
  return (
    <section
      id={section.id}
      className="gs-section gs-gallery"
      data-tone={section.tone}
      {...sectionPresentation(section.id, presentationOverrides)}
    >
      <div className="gs-shell">
        <SectionIntro section={section} />
        <div className="gs-gallery-grid">
          {items.map((item, index) => {
            const slot = `gallery-${Math.min(index + 1, 3)}` as GenerativeMediaSlot;
            return (
              <article key={`${section.id}-${item.title}`}>
                <GenerativeArtwork
                  slot={slot}
                  section={{ ...section, heading: item.title }}
                  areaId={`${section.id}:${index + 1}`}
                  presentationOverrides={presentationOverrides}
                />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FaqSection({
  section,
  presentationOverrides,
}: {
  section: GenerativeSiteSection;
  presentationOverrides?: DemoPresentationOverrides | undefined;
}) {
  const config = useSiteConfig();
  const items = resolvedItems(config, section);
  return (
    <section
      id={section.id}
      className="gs-section gs-faq"
      data-tone={section.tone}
      {...sectionPresentation(section.id, presentationOverrides)}
    >
      <div className="gs-shell gs-faq-grid">
        <SectionIntro section={section} />
        <div className="gs-faq-list">
          {items.map((item) => (
            <details key={`${section.id}-${item.title}`}>
              <summary>
                {item.title} <span aria-hidden="true">+</span>
              </summary>
              <p>{item.body}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContentSection({
  section,
  presentationOverrides,
}: {
  section: GenerativeSiteSection;
  presentationOverrides?: DemoPresentationOverrides | undefined;
}) {
  const config = useSiteConfig();
  const hasMedia = section.mediaSlot !== "none";
  const hasItems = resolvedItems(config, section).length > 0;
  return (
    <section
      id={section.id}
      className={`gs-section gs-${section.kind}`}
      data-layout={section.layout}
      data-tone={section.tone}
      {...sectionPresentation(section.id, presentationOverrides)}
    >
      <div className="gs-shell gs-section-grid">
        <SectionIntro section={section} />
        {hasMedia ? (
          <GenerativeArtwork
            slot={section.mediaSlot}
            section={section}
            areaId={section.id}
            presentationOverrides={presentationOverrides}
          />
        ) : null}
        {hasItems ? <ItemGrid section={section} /> : null}
      </div>
    </section>
  );
}

function GenerativeHeader({
  variant,
  presentationOverrides,
}: {
  variant: GenerativeSiteVariant;
  presentationOverrides?: DemoPresentationOverrides | undefined;
}) {
  const config = useSiteConfig();
  const sections = variant.sections.filter((section) => section.kind !== "hero").slice(0, 4);
  return (
    <header className="gs-header" {...sectionPresentation("header", presentationOverrides)}>
      <a className="gs-brand" href="#top" aria-label={`${config.brand.name} home`}>
        <span>{config.brand.shortName}</span>
        <strong>{config.brand.name}</strong>
      </a>
      <nav aria-label="Website navigation">
        {sections.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.eyebrow || section.kind}
          </a>
        ))}
      </nav>
      <a className="gs-header-cta" href="#contact">
        {config.header.primaryCta.label}
      </a>
    </header>
  );
}

function GenerativeFooter({
  presentationOverrides,
}: {
  presentationOverrides?: DemoPresentationOverrides | undefined;
}) {
  const config = useSiteConfig();
  return (
    <footer className="gs-footer" {...sectionPresentation("footer", presentationOverrides)}>
      <div className="gs-shell">
        <div>
          <strong>{config.brand.name}</strong>
          <p>{config.brand.tagline}</p>
        </div>
        <div>
          {config.brand.phone ? (
            <a href={`tel:${config.brand.phone}`}>{config.brand.phone}</a>
          ) : null}
          {config.brand.email ? (
            <a href={`mailto:${config.brand.email}`}>{config.brand.email}</a>
          ) : null}
        </div>
        <p>
          © {new Date().getFullYear()} {config.brand.name}. {config.footer.copyrightSuffix}
        </p>
      </div>
    </footer>
  );
}

export function CompositionalSiteRenderer({
  variant,
  leadCaptureTarget,
  fontOverride,
  presentationOverrides,
}: {
  variant: GenerativeSiteVariant;
  leadCaptureTarget?: WebsiteLeadCaptureTarget | undefined;
  fontOverride?: PreviewFontVariables | undefined;
  presentationOverrides?: DemoPresentationOverrides | undefined;
}) {
  const palette = variant.palette;
  const style = {
    ...generatedTypographyVariables[variant.typography],
    ...fontOverride,
    "--gs-bg": palette.background,
    "--gs-surface": palette.surface,
    "--gs-surface-text": palette.surfaceText,
    "--gs-text": palette.text,
    "--gs-muted": palette.mutedText,
    "--gs-contrast": palette.contrast,
    "--gs-contrast-text": palette.contrastText,
    "--gs-accent": "var(--clay, " + palette.accent + ")",
    "--gs-accent-text": `var(--bone, ${palette.accentText})`,
  } as CSSProperties;

  return (
    <div
      id="top"
      className="gs-site"
      data-direction={variant.direction}
      data-density={variant.density}
      data-motion={variant.motion}
      data-shape={variant.shape}
      data-typography={variant.typography}
      style={style}
    >
      <GenerativeHeader variant={variant} presentationOverrides={presentationOverrides} />
      <main>
        {variant.sections.map((section) => {
          if (section.kind === "hero")
            return (
              <HeroSection
                key={section.id}
                section={section}
                presentationOverrides={presentationOverrides}
              />
            );
          if (section.kind === "gallery")
            return (
              <GallerySection
                key={section.id}
                section={section}
                presentationOverrides={presentationOverrides}
              />
            );
          if (section.kind === "faq")
            return (
              <FaqSection
                key={section.id}
                section={section}
                presentationOverrides={presentationOverrides}
              />
            );
          if (section.kind === "contact") {
            const contactColors = presentationOverrides?.sectionStyles[section.id] ?? {
              backgroundColor: variant.palette.contrast,
              textColor: variant.palette.contrastText,
            };
            return (
              <div id={section.id} key={section.id}>
                <Contact
                  leadCaptureTarget={leadCaptureTarget}
                  visualDirection={variant.direction}
                  content={{
                    eyebrow: section.eyebrow,
                    heading: section.heading,
                    body: section.body,
                  }}
                  presentation={contactColors}
                />
              </div>
            );
          }
          return (
            <ContentSection
              key={section.id}
              section={section}
              presentationOverrides={presentationOverrides}
            />
          );
        })}
      </main>
      <GenerativeFooter presentationOverrides={presentationOverrides} />
    </div>
  );
}
