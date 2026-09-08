import { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Menu, Sparkles, X } from "lucide-react";

import { Reveal } from "@/components/Reveal";
import type { DemoVisualDirection } from "@/data/demo-themes";
import { resolveCreativeBlueprint, resolveSiteStory } from "@/data/site-experience";
import type { GeneratedSectionId } from "@/data/site";
import { useSiteConfig } from "@/data/site-config-context";

import { Contact, type WebsiteLeadCaptureTarget } from "./Contact";

type VariantProps = {
  direction: DemoVisualDirection;
  leadCaptureTarget?: WebsiteLeadCaptureTarget | undefined;
};

function Brand({ inverse = false }: { inverse?: boolean }) {
  const { brand } = useSiteConfig();
  return (
    <a href="#top" className={`gs-brand ${inverse ? "gs-brand-inverse" : ""}`}>
      <span className="gs-brand-mark" aria-hidden="true">
        {brand.shortName}
      </span>
      <span>{brand.name}</span>
    </a>
  );
}

function Header({ direction }: { direction: DemoVisualDirection }) {
  const [open, setOpen] = useState(false);
  const { navigation, header } = useSiteConfig();
  const inverse = direction === "modern" || direction === "luxury";
  return (
    <header className="gs-header" data-inverse={inverse || undefined}>
      <div className="gs-shell gs-header-inner">
        <Brand inverse={inverse} />
        <nav className="gs-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="gs-header-cta" href={header.primaryCta.href}>
          {header.primaryCta.label}
          <ArrowUpRight aria-hidden="true" />
        </a>
        <button
          type="button"
          className="gs-menu-button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open ? (
        <nav className="gs-mobile-nav" aria-label="Mobile navigation">
          {navigation.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

function Media({
  kind,
  galleryIndex = 0,
  className = "",
}: {
  kind: "hero" | "about" | "gallery";
  galleryIndex?: number;
  className?: string;
}) {
  const { assets, brand } = useSiteConfig();
  const asset = kind === "gallery" ? assets.gallery?.[galleryIndex] : assets[kind];
  if (asset?.src) {
    return (
      <figure className={`gs-media ${className}`}>
        <img src={asset.src} alt={asset.alt} loading={kind === "hero" ? "eager" : "lazy"} />
      </figure>
    );
  }
  return (
    <figure
      className={`gs-media gs-media-fallback ${className}`}
      role="img"
      aria-label={asset?.alt ?? `${brand.name} visual`}
    >
      <span className="gs-orbit gs-orbit-one" />
      <span className="gs-orbit gs-orbit-two" />
      <span className="gs-media-initials">{brand.shortName}</span>
      <span className="gs-media-caption">{asset?.brief ?? brand.tagline}</span>
    </figure>
  );
}

function Actions() {
  const { hero } = useSiteConfig();
  return (
    <div className="gs-actions">
      <a className="gs-button gs-button-primary" href={hero.primaryCta.href}>
        {hero.primaryCta.label}
        <ArrowUpRight aria-hidden="true" />
      </a>
      <a className="gs-button gs-button-quiet" href={hero.secondaryCta.href}>
        {hero.secondaryCta.label}
        <ArrowRight aria-hidden="true" />
      </a>
    </div>
  );
}

function Hero({ direction }: { direction: DemoVisualDirection }) {
  const config = useSiteConfig();
  const blueprint = resolveCreativeBlueprint(config, direction);
  const { hero, brand } = config;
  return (
    <section id="top" className="gs-hero" data-layout={blueprint.heroLayout}>
      <div className="gs-hero-mesh" aria-hidden="true" />
      <div className="gs-shell gs-hero-grid">
        <Reveal className="gs-hero-copy">
          <p className="gs-kicker">
            <span />
            {hero.eyebrow}
          </p>
          <h1>{hero.headline}</h1>
          <p className="gs-hero-description">{hero.description}</p>
          <Actions />
        </Reveal>
        <Reveal className="gs-hero-media-wrap" delay={100}>
          <Media kind="hero" className="gs-hero-media" />
          <div className="gs-floating-note">
            <Sparkles aria-hidden="true" />
            <span>{brand.tagline}</span>
          </div>
        </Reveal>
        {hero.metrics.length ? (
          <dl className="gs-metrics">
            {hero.metrics.slice(0, 3).map((metric) => (
              <div key={`${metric.value}-${metric.label}`}>
                <dd>{metric.value}</dd>
                <dt>{metric.label}</dt>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}

function SectionIntro({
  eyebrow,
  heading,
  body,
}: {
  eyebrow: string;
  heading: string;
  body?: string;
}) {
  return (
    <div className="gs-section-intro">
      <p className="gs-kicker">
        <span />
        {eyebrow}
      </p>
      <h2>{heading}</h2>
      {body ? <p>{body}</p> : null}
    </div>
  );
}

function Services({ direction }: { direction: DemoVisualDirection }) {
  const config = useSiteConfig();
  const blueprint = resolveCreativeBlueprint(config, direction);
  const { services } = config;
  return (
    <section id="services" className="gs-section gs-services">
      <div className="gs-shell">
        <Reveal>
          <SectionIntro eyebrow={services.eyebrow} heading={services.heading} />
        </Reveal>
        <div className="gs-service-grid" data-layout={blueprint.serviceLayout}>
          {services.items.map((service, index) => (
            <Reveal key={`${service.number}-${service.title}`} delay={index * 60}>
              <article className="gs-service-card">
                <div className="gs-service-number">{service.number}</div>
                <div>
                  <h3>{service.title}</h3>
                  <p>{service.body}</p>
                </div>
                <ArrowUpRight className="gs-card-arrow" aria-hidden="true" />
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Showcase() {
  const config = useSiteConfig();
  const story = resolveSiteStory(config);
  return (
    <section id="showcase" className="gs-section gs-showcase">
      <div className="gs-shell">
        <Reveal>
          <SectionIntro
            eyebrow={story.showcase.eyebrow}
            heading={story.showcase.heading}
            body={story.showcase.body}
          />
        </Reveal>
        <div className="gs-showcase-grid">
          {story.showcase.items.slice(0, 3).map((item, index) => (
            <Reveal key={`${item.title}-${index}`} delay={index * 80}>
              <article className="gs-showcase-card">
                <Media kind="gallery" galleryIndex={index} />
                <div className="gs-showcase-copy">
                  <span>0{index + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  const config = useSiteConfig();
  const story = resolveSiteStory(config);
  const { about } = config;
  return (
    <section id="about" className="gs-section gs-about">
      <div className="gs-shell gs-about-grid">
        <Reveal className="gs-about-media-wrap">
          <Media kind="about" className="gs-about-media" />
          <div className="gs-about-stamp">Built with intention</div>
        </Reveal>
        <Reveal className="gs-about-copy" delay={100}>
          <SectionIntro
            eyebrow={story.value.eyebrow}
            heading={story.value.heading}
            body={story.value.body}
          />
          <div className="gs-about-points">
            {about.points.map((point) => (
              <div key={point}>
                <Check aria-hidden="true" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Process() {
  const story = resolveSiteStory(useSiteConfig());
  return (
    <section className="gs-section gs-process">
      <div className="gs-shell gs-process-grid">
        <Reveal>
          <SectionIntro eyebrow={story.process.eyebrow} heading={story.process.heading} />
        </Reveal>
        <div className="gs-process-list">
          {story.process.items.map((item, index) => (
            <Reveal key={`${item.title}-${index}`} delay={index * 60}>
              <article>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Experience() {
  const { reviews } = useSiteConfig();
  return (
    <section id="reviews" className="gs-section gs-experience">
      <div className="gs-shell">
        <Reveal>
          <SectionIntro eyebrow={reviews.eyebrow} heading={reviews.heading} />
        </Reveal>
        <div className="gs-experience-grid">
          {reviews.items.map((item, index) => (
            <Reveal key={`${item.author}-${index}`} delay={index * 60}>
              <article>
                <Sparkles aria-hidden="true" />
                <p>{item.quote}</p>
                <footer>
                  <strong>{item.author}</strong>
                  <span>{item.place}</span>
                </footer>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const { faq } = useSiteConfig();
  return (
    <section id="faq" className="gs-section gs-faq">
      <div className="gs-shell gs-faq-grid">
        <Reveal>
          <SectionIntro eyebrow={faq.eyebrow} heading={faq.heading} />
        </Reveal>
        <div className="gs-faq-list">
          {faq.items.map((item, index) => (
            <Reveal key={item.question} delay={index * 35}>
              <details>
                <summary>
                  <span>{item.question}</span>
                  <span className="gs-faq-icon" aria-hidden="true" />
                </summary>
                <p>{item.answer}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCallout() {
  const config = useSiteConfig();
  const story = resolveSiteStory(config);
  return (
    <div className="gs-shell gs-closing-callout">
      <div>
        <p className="gs-kicker">
          <span />
          {story.closingCta.eyebrow}
        </p>
        <h2>{story.closingCta.heading}</h2>
        <p>{story.closingCta.body}</p>
      </div>
      <a className="gs-button gs-button-primary" href={config.hero.primaryCta.href}>
        {config.hero.primaryCta.label}
        <ArrowUpRight aria-hidden="true" />
      </a>
    </div>
  );
}

function ContactSection({ direction, leadCaptureTarget }: VariantProps) {
  return (
    <section className="gs-contact-wrap">
      <ClosingCallout />
      <Contact visualDirection={direction} leadCaptureTarget={leadCaptureTarget} />
    </section>
  );
}

function Footer() {
  const { brand, navigation, footer, assetAttributions } = useSiteConfig();
  return (
    <footer className="gs-footer">
      <div className="gs-shell gs-footer-grid">
        <div>
          <Brand inverse />
          <p>{brand.tagline}</p>
        </div>
        <nav aria-label="Footer navigation">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="gs-shell gs-footer-bottom">
        <span>
          © {new Date().getFullYear()} {brand.name} {footer.copyrightSuffix}
        </span>
        {assetAttributions?.length ? (
          <span>
            {assetAttributions.map((attribution, index) => (
              <span key={attribution.href}>
                {index ? " · " : ""}
                <a href={attribution.href} target="_blank" rel="noreferrer">
                  {attribution.label}
                </a>
              </span>
            ))}
          </span>
        ) : null}
      </div>
    </footer>
  );
}

function OrderedSection({
  section,
  direction,
  leadCaptureTarget,
}: VariantProps & { section: GeneratedSectionId }) {
  switch (section) {
    case "services":
      return <Services direction={direction} />;
    case "showcase":
      return <Showcase />;
    case "about":
      return <About />;
    case "process":
      return <Process />;
    case "experience":
      return <Experience />;
    case "faq":
      return <Faq />;
    case "contact":
      return <ContactSection direction={direction} leadCaptureTarget={leadCaptureTarget} />;
  }
}

export function VisualDirectionSite({ direction, leadCaptureTarget }: VariantProps) {
  const config = useSiteConfig();
  const blueprint = resolveCreativeBlueprint(config, direction);
  return (
    <div
      className="generated-site"
      data-direction={direction}
      data-archetype={blueprint.archetype}
      data-density={blueprint.density}
      data-motion={blueprint.motion}
      data-surface={blueprint.surfaceStyle}
      data-image-treatment={blueprint.imageTreatment}
      data-accent={blueprint.accentStyle}
      data-section-flow={blueprint.sectionFlow}
    >
      <Header direction={direction} />
      <main>
        <Hero direction={direction} />
        {blueprint.sectionOrder.map((section) => (
          <OrderedSection
            key={section}
            section={section}
            direction={direction}
            leadCaptureTarget={leadCaptureTarget}
          />
        ))}
      </main>
      <Footer />
    </div>
  );
}
