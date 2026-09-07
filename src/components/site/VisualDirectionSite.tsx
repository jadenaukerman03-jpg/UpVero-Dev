import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

import { Reveal } from "@/components/Reveal";
import type { DemoVisualDirection } from "@/data/demo-themes";
import { useSiteConfig } from "@/data/site-config-context";

import { Contact, type WebsiteLeadCaptureTarget } from "./Contact";
import { Faq } from "./Faq";
import { Footer } from "./Footer";
import { Testimonials } from "./Testimonials";

type VariantProps = {
  direction: DemoVisualDirection;
  leadCaptureTarget?: WebsiteLeadCaptureTarget | undefined;
};

function Brand({ light = false }: { light?: boolean }) {
  const { brand } = useSiteConfig();
  return (
    <a href="#top" className="flex items-center gap-2.5">
      <span
        className={`grid size-9 place-items-center rounded-md font-display text-sm font-semibold ${
          light ? "bg-bone text-ink" : "bg-ink text-bone"
        }`}
      >
        {brand.shortName}
      </span>
      <span
        className={`font-display text-lg font-semibold tracking-tight ${light ? "text-bone" : "text-ink"}`}
      >
        {brand.name}
      </span>
    </a>
  );
}

function SiteImage({ kind, className }: { kind: "hero" | "about"; className: string }) {
  const { assets } = useSiteConfig();
  const image = assets[kind];
  if (image.src) {
    return (
      <img
        src={image.src}
        alt={image.alt}
        width={kind === "hero" ? 1920 : 1080}
        height={kind === "hero" ? 1080 : 1200}
        className={className}
      />
    );
  }
  return null;
}

function Actions({ inverse = false }: { inverse?: boolean }) {
  const { hero } = useSiteConfig();
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={hero.primaryCta.href}
        className="rounded-full bg-clay px-6 py-3 text-sm font-semibold text-bone transition hover:bg-clay-dark"
      >
        {hero.primaryCta.label}
      </a>
      <a
        href={hero.secondaryCta.href}
        className={`rounded-full px-5 py-3 text-sm font-semibold transition ${inverse ? "text-bone hover:bg-white/10" : "text-ink hover:bg-sand"}`}
      >
        {hero.secondaryCta.label}
      </a>
    </div>
  );
}

function VariantHeader({ direction }: VariantProps) {
  const [open, setOpen] = useState(false);
  const { navigation, header } = useSiteConfig();
  const headerStyle: Record<DemoVisualDirection, string> = {
    professional: "sticky top-0 border-b border-ink/10 bg-bone/92 backdrop-blur",
    modern: "absolute inset-x-0 top-0 border-b border-white/10 bg-ink/45 text-bone backdrop-blur",
    luxury: "absolute inset-x-0 top-0 bg-linear-to-b from-black/55 to-transparent text-bone",
    friendly: "sticky top-0 border-b border-clay/15 bg-bone/95 shadow-sm",
    minimal: "border-b border-ink/10 bg-bone",
  };
  const light = direction === "modern" || direction === "luxury";
  return (
    <header className={`relative z-30 ${headerStyle[direction]}`}>
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10 ${direction === "luxury" ? "sm:py-7" : ""}`}
      >
        <Brand light={light} />
        <nav
          className={`hidden items-center gap-7 text-sm md:flex ${light ? "text-bone/75" : "text-ink/70"}`}
        >
          {navigation.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:opacity-60">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href={header.primaryCta.href}
            className={`hidden px-5 py-2.5 text-sm font-semibold sm:inline-block ${direction === "luxury" ? "border border-bone/60 text-bone" : direction === "minimal" ? "border-b border-ink pb-1" : light ? "rounded-full bg-bone text-ink" : "rounded-full bg-ink text-bone"}`}
          >
            {header.primaryCta.label}
          </a>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            className={`grid size-10 place-items-center md:hidden ${light ? "text-bone" : "text-ink"}`}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-ink/10 bg-bone px-6 py-5 text-ink md:hidden">
          <div className="flex flex-col gap-4">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

function Metrics({ className = "" }: { className?: string }) {
  const { hero } = useSiteConfig();
  return (
    <dl className={className}>
      {hero.metrics.map((metric) => (
        <div key={metric.label}>
          <dd className="font-display text-2xl font-semibold">{metric.value}</dd>
          <dt className="mt-1 text-[0.68rem] tracking-[0.12em] uppercase opacity-55">
            {metric.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}

function VariantHero({ direction }: VariantProps) {
  const { hero, brand, assets } = useSiteConfig();
  if (direction === "modern")
    return (
      <section
        id="top"
        className="relative overflow-hidden bg-ink pb-14 pt-28 text-bone sm:pb-20 sm:pt-36"
      >
        <div className="absolute -right-24 top-24 size-[34rem] rounded-full bg-clay/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 sm:px-10 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <div>
            <Reveal>
              <p className="mb-5 text-sm font-semibold tracking-[.2em] text-clay uppercase">
                {hero.eyebrow}
              </p>
              <h1 className="max-w-[10ch] font-display text-5xl font-semibold leading-[.88] tracking-[-.06em] sm:text-7xl lg:text-8xl">
                {hero.headline}
              </h1>
            </Reveal>
            <Reveal delay={100}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-bone/80">
                {hero.description}
              </p>
              <div className="mt-7">
                <Actions inverse />
              </div>
            </Reveal>
          </div>
          <Reveal delay={170}>
            <div className="relative">
              <SiteImage
                kind="hero"
                className="aspect-[4/5] w-full object-cover sm:aspect-[16/10] lg:aspect-[4/5]"
              />
              <div className="absolute -bottom-5 -left-5 hidden bg-clay p-6 text-bone sm:block">
                <span className="font-display text-3xl">{brand.shortName}</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    );
  if (direction === "luxury")
    return (
      <section
        id="top"
        className="relative flex min-h-[40rem] items-end overflow-hidden bg-ink text-bone"
      >
        <SiteImage kind="hero" className="absolute inset-0 size-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/45 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-16 sm:px-10 sm:pb-24">
          <Reveal>
            <p className="mb-4 text-xs tracking-[.35em] text-bone/85 uppercase">{hero.eyebrow}</p>
            <h1 className="max-w-[13ch] font-display text-5xl font-medium leading-[.95] tracking-[-.035em] sm:text-7xl">
              {hero.headline}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-bone/85">
              {hero.description}
            </p>
            <div className="mt-7">
              <Actions inverse />
            </div>
          </Reveal>
        </div>
      </section>
    );
  if (direction === "friendly")
    return (
      <section id="top" className="overflow-hidden bg-sand/65 pt-12">
        <div className="mx-auto max-w-6xl px-6 text-center sm:px-10">
          <Reveal>
            <p className="mx-auto mb-4 inline-flex rounded-full bg-bone px-4 py-2 text-xs font-semibold tracking-wide text-clay">
              {hero.eyebrow}
            </p>
            <h1 className="mx-auto max-w-[14ch] font-display text-4xl font-semibold leading-tight text-ink sm:text-6xl">
              {hero.headline}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
              {hero.description}
            </p>
            <div className="mt-8 flex justify-center">
              <Actions />
            </div>
          </Reveal>
          {assets.hero.src ? (
            <Reveal delay={160}>
              <div className="relative mt-14 overflow-hidden rounded-t-[5rem] bg-bone p-3 sm:rounded-t-[9rem] sm:p-5">
                <SiteImage
                  kind="hero"
                  className="aspect-[16/8] w-full rounded-t-[4.25rem] object-cover sm:rounded-t-[8rem]"
                />
              </div>
            </Reveal>
          ) : null}
        </div>
      </section>
    );
  if (direction === "minimal")
    return (
      <section id="top" className="bg-bone">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:px-10 sm:py-36">
          <Reveal>
            <p className="text-xs font-semibold tracking-[.18em] text-ink/50 uppercase">
              {brand.tagline}
            </p>
            <h1 className="mt-8 max-w-[11ch] font-display text-5xl font-medium leading-[.92] tracking-[-.065em] text-ink sm:text-7xl lg:text-8xl">
              {hero.headline}
            </h1>
            <div className="mt-12 grid gap-8 border-t border-ink/15 pt-6 md:grid-cols-[1fr_auto]">
              <p className="max-w-xl text-base leading-relaxed text-ink/65">{hero.description}</p>
              <Actions />
            </div>
          </Reveal>
        </div>
      </section>
    );
  return (
    <section id="top" className="bg-bone">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <Reveal>
            <p className="mb-5 text-sm font-semibold tracking-wide text-clay">{hero.eyebrow}</p>
            <h1 className="max-w-[12ch] font-display text-5xl font-medium leading-[1] tracking-tight text-ink sm:text-6xl">
              {hero.headline}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70">{hero.description}</p>
            <div className="mt-8">
              <Actions />
            </div>
            <Metrics className="mt-12 flex flex-wrap gap-x-10 gap-y-5 text-ink" />
          </Reveal>
        </div>
        <Reveal delay={130}>
          <SiteImage
            kind="hero"
            className="aspect-[5/4] w-full rounded-2xl object-cover shadow-xl shadow-ink/10"
          />
        </Reveal>
      </div>
    </section>
  );
}

function SectionTitle({
  eyebrow,
  heading,
  centered = false,
}: {
  eyebrow: string;
  heading: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto mb-12 max-w-2xl text-center" : "mb-12 max-w-xl"}>
      <p className="mb-3 text-xs font-semibold tracking-[.16em] text-clay uppercase">{eyebrow}</p>
      <h2 className="font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
        {heading}
      </h2>
    </div>
  );
}

function VariantServices({ direction }: VariantProps) {
  const { services } = useSiteConfig();
  if (direction === "luxury")
    return (
      <section id="services" className="bg-bone">
        <div className="mx-auto max-w-7xl px-6 py-28 sm:px-10 sm:py-40">
          <SectionTitle eyebrow={services.eyebrow} heading={services.heading} />
          <div className="border-y border-ink/15">
            {services.items.map((item, index) => (
              <Reveal key={item.number} delay={index * 70}>
                <article className="grid gap-4 border-b border-ink/15 py-8 last:border-0 md:grid-cols-[8rem_1fr_1.3fr]">
                  <span className="font-display text-lg text-clay">{item.number}</span>
                  <h3 className="font-display text-2xl text-ink">{item.title}</h3>
                  <p className="leading-relaxed text-ink/65">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  if (direction === "modern")
    return (
      <section id="services" className="overflow-hidden bg-bone">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:px-10 sm:py-32">
          <SectionTitle eyebrow={services.eyebrow} heading={services.heading} />
          <div className="grid gap-4 md:grid-cols-12">
            {services.items.map((item, index) => (
              <Reveal
                key={item.number}
                delay={index * 70}
                className={index === 0 || index === 3 ? "md:col-span-7" : "md:col-span-5"}
              >
                <article
                  className={`h-full p-8 ${index === 0 ? "bg-ink text-bone" : index === 3 ? "bg-clay text-bone" : "bg-sand/70 text-ink"}`}
                >
                  <span className="text-xs font-semibold tracking-[.2em] opacity-55">
                    {item.number}
                  </span>
                  <h3 className="mt-12 font-display text-3xl font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-4 max-w-md leading-relaxed opacity-70">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  if (direction === "friendly")
    return (
      <section id="services" className="bg-bone">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
          <SectionTitle eyebrow={services.eyebrow} heading={services.heading} centered />
          <div className="grid gap-5 sm:grid-cols-2">
            {services.items.map((item, index) => (
              <Reveal key={item.number} delay={index * 80}>
                <article className="h-full rounded-[2rem] bg-sand/65 p-7 ring-1 ring-clay/10">
                  <span className="grid size-11 place-items-center rounded-2xl bg-clay text-sm font-bold text-bone">
                    {item.number}
                  </span>
                  <h3 className="mt-6 font-display text-2xl text-ink">{item.title}</h3>
                  <p className="mt-3 leading-relaxed text-ink/65">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  if (direction === "minimal")
    return (
      <section id="services" className="bg-bone">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:px-10 sm:py-36">
          <SectionTitle eyebrow={services.eyebrow} heading={services.heading} />
          <div>
            {services.items.map((item, index) => (
              <Reveal key={item.number} delay={index * 60}>
                <article className="grid gap-3 border-t border-ink/15 py-7 md:grid-cols-[5rem_1fr_1.2fr]">
                  <span className="text-sm text-ink/45">{item.number}</span>
                  <h3 className="font-display text-2xl text-ink">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-ink/60">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  return (
    <section id="services" className="bg-sand/45">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
        <SectionTitle eyebrow={services.eyebrow} heading={services.heading} />
        <div className="grid gap-5 md:grid-cols-2">
          {services.items.map((item, index) => (
            <Reveal key={item.number} delay={index * 70}>
              <article className="h-full rounded-xl bg-bone p-8 shadow-sm ring-1 ring-ink/8">
                <span className="text-sm font-semibold text-clay">{item.number}</span>
                <h3 className="mt-6 font-display text-2xl text-ink">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-ink/65">{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Points({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function VariantAbout({ direction }: VariantProps) {
  const { about } = useSiteConfig();
  if (direction === "modern")
    return (
      <section id="about" className="bg-sand/65">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-24 sm:px-10 sm:py-32 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="text-xs font-semibold tracking-[.16em] text-clay uppercase">
              {about.eyebrow}
            </p>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-none tracking-tight text-ink sm:text-6xl">
              {about.heading}
            </h2>
            <Points
              items={about.points}
              className="mt-10 space-y-4 text-sm font-medium text-ink/70"
            />
          </Reveal>
          <Reveal delay={100} className="lg:col-span-7">
            <SiteImage kind="about" className="aspect-[16/9] w-full object-cover" />
            <p className="ml-auto mt-8 max-w-xl text-lg leading-relaxed text-ink/70">
              {about.body}
            </p>
          </Reveal>
        </div>
      </section>
    );
  if (direction === "luxury")
    return (
      <section id="about" className="bg-ink py-10 text-bone sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SiteImage kind="about" className="aspect-[4/5] w-full object-cover grayscale" />
          </Reveal>
          <Reveal delay={100}>
            <p className="text-xs tracking-[.28em] text-clay uppercase">{about.eyebrow}</p>
            <h2 className="mt-6 max-w-[12ch] font-display text-4xl leading-tight sm:text-6xl">
              {about.heading}
            </h2>
            <p className="mt-7 max-w-lg leading-relaxed text-bone/70">{about.body}</p>
            <Points
              items={about.points}
              className="mt-10 space-y-4 border-l border-clay pl-5 text-sm text-bone/75"
            />
          </Reveal>
        </div>
      </section>
    );
  if (direction === "friendly")
    return (
      <section id="about" className="bg-sand/50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
          <div className="grid items-center gap-10 rounded-[3rem] bg-bone p-6 sm:p-10 md:grid-cols-2">
            <Reveal>
              <SiteImage
                kind="about"
                className="aspect-square w-full rounded-[2rem] object-cover"
              />
            </Reveal>
            <Reveal delay={100}>
              <SectionTitle eyebrow={about.eyebrow} heading={about.heading} />
              <p className="leading-relaxed text-ink/70">{about.body}</p>
              <Points
                items={about.points}
                className="mt-7 space-y-3 text-sm text-ink/75 [&_li]:rounded-xl [&_li]:bg-sand/65 [&_li]:px-4 [&_li]:py-3"
              />
            </Reveal>
          </div>
        </div>
      </section>
    );
  if (direction === "minimal")
    return (
      <section id="about" className="bg-bone">
        <div className="mx-auto max-w-3xl px-6 py-28 text-center sm:px-10 sm:py-40">
          <Reveal>
            <p className="text-xs tracking-[.18em] text-ink/45 uppercase">{about.eyebrow}</p>
            <h2 className="mt-6 font-display text-4xl leading-tight tracking-tight text-ink sm:text-6xl">
              {about.heading}
            </h2>
            <p className="mx-auto mt-8 max-w-2xl leading-relaxed text-ink/65">{about.body}</p>
            <Points
              items={about.points}
              className="mx-auto mt-12 grid max-w-xl gap-4 text-sm text-ink/70"
            />
          </Reveal>
        </div>
      </section>
    );
  return (
    <section id="about" className="bg-bone">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 sm:px-10 sm:py-28 md:grid-cols-2 md:items-center">
        <Reveal>
          <SiteImage kind="about" className="aspect-[4/5] w-full rounded-xl object-cover" />
        </Reveal>
        <Reveal delay={100}>
          <SectionTitle eyebrow={about.eyebrow} heading={about.heading} />
          <p className="leading-relaxed text-ink/70">{about.body}</p>
          <Points
            items={about.points}
            className="mt-8 space-y-4 text-sm text-ink/75 [&_li]:border-l-2 [&_li]:border-clay [&_li]:pl-4"
          />
        </Reveal>
      </div>
    </section>
  );
}

function OrderedSections({ direction, leadCaptureTarget }: VariantProps) {
  const sections: Record<DemoVisualDirection, ReactNode[]> = {
    professional: [
      <VariantServices key="services" direction={direction} />,
      <VariantAbout key="about" direction={direction} />,
      <Testimonials key="reviews" />,
      <Faq key="faq" />,
      <Contact key="contact" leadCaptureTarget={leadCaptureTarget} />,
    ],
    modern: [
      <VariantServices key="services" direction={direction} />,
      <VariantAbout key="about" direction={direction} />,
      <Contact key="contact" leadCaptureTarget={leadCaptureTarget} />,
      <Testimonials key="reviews" />,
      <Faq key="faq" />,
    ],
    luxury: [
      <VariantAbout key="about" direction={direction} />,
      <VariantServices key="services" direction={direction} />,
      <Testimonials key="reviews" />,
      <Contact key="contact" leadCaptureTarget={leadCaptureTarget} />,
      <Faq key="faq" />,
    ],
    friendly: [
      <VariantServices key="services" direction={direction} />,
      <Testimonials key="reviews" />,
      <VariantAbout key="about" direction={direction} />,
      <Faq key="faq" />,
      <Contact key="contact" leadCaptureTarget={leadCaptureTarget} />,
    ],
    minimal: [
      <VariantServices key="services" direction={direction} />,
      <VariantAbout key="about" direction={direction} />,
      <Contact key="contact" leadCaptureTarget={leadCaptureTarget} />,
      <Faq key="faq" />,
      <Testimonials key="reviews" />,
    ],
  };
  return <>{sections[direction]}</>;
}

export function VisualDirectionSite({ direction, leadCaptureTarget }: VariantProps) {
  return (
    <div className={`visual-direction visual-direction-${direction}`}>
      <VariantHeader direction={direction} />
      <main>
        <VariantHero direction={direction} />
        <OrderedSections direction={direction} leadCaptureTarget={leadCaptureTarget} />
      </main>
      <Footer />
    </div>
  );
}
