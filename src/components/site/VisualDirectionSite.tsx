import { useState, type ReactNode } from "react";
import { ArrowUpRight, Check, Menu, Sparkles, X } from "lucide-react";

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
  const { assets, brand } = useSiteConfig();
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
  return (
    <div
      className={`isolate overflow-hidden bg-ink ${className}`}
      role="img"
      aria-label={image.alt}
    >
      <div className="absolute -right-16 -top-16 size-64 rounded-full bg-clay/80 blur-2xl" />
      <div className="absolute -bottom-20 -left-16 size-72 rounded-full bg-sand/20 blur-3xl" />
      <div className="absolute inset-[12%] rounded-[inherit] border border-bone/15" />
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-[clamp(4rem,12vw,9rem)] font-semibold tracking-[-.08em] text-bone/90">
          {brand.shortName}
        </span>
      </div>
    </div>
  );
}

function Actions({ inverse = false }: { inverse?: boolean }) {
  const { hero } = useSiteConfig();
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={hero.primaryCta.href}
        className="group inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3 text-sm font-semibold text-bone shadow-lg shadow-clay/20 transition duration-300 hover:-translate-y-0.5 hover:bg-clay-dark"
      >
        {hero.primaryCta.label}
        <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
    professional:
      "sticky top-0 border-b border-ink/8 bg-bone/88 shadow-[0_12px_40px_-28px_rgb(18_26_38/.45)] backdrop-blur-xl",
    modern:
      "absolute inset-x-0 top-0 border-b border-white/10 bg-ink/55 text-bone backdrop-blur-xl",
    luxury:
      "absolute inset-x-0 top-0 border-b border-bone/10 bg-linear-to-b from-black/70 to-transparent text-bone",
    friendly:
      "sticky top-0 border-b border-clay/12 bg-bone/90 shadow-[0_12px_40px_-30px_rgb(18_38_28/.5)] backdrop-blur-xl",
    minimal: "border-b border-ink/12 bg-bone",
  };
  const light = direction === "modern" || direction === "luxury";
  return (
    <header className={`relative z-30 ${headerStyle[direction]}`}>
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10 ${direction === "luxury" ? "sm:py-6" : ""}`}
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
            className={`hidden px-5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 sm:inline-block ${direction === "luxury" ? "border border-bone/50 bg-black/10 text-bone backdrop-blur" : direction === "minimal" ? "border-b border-ink px-1 pb-1" : light ? "rounded-full bg-bone text-ink shadow-lg" : "rounded-full bg-ink text-bone shadow-lg shadow-ink/15"}`}
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
  const hasHeroImage = Boolean(assets.hero.src);
  if (direction === "modern")
    return (
      <section
        id="top"
        className="demo-modern-grid relative overflow-hidden bg-ink pb-12 pt-28 text-bone sm:pb-16 sm:pt-36"
      >
        <div className="absolute -right-24 top-10 size-[32rem] rounded-full bg-clay/30 blur-3xl" />
        <div className="absolute -bottom-48 left-1/3 size-[28rem] rounded-full bg-bone/8 blur-3xl" />
        <div
          className={`relative mx-auto grid max-w-7xl gap-10 px-6 sm:px-10 ${hasHeroImage ? "lg:grid-cols-[1.1fr_.9fr] lg:items-end" : "max-w-4xl"}`}
        >
          <div>
            <Reveal>
              <p className="mb-5 text-sm font-semibold tracking-[.2em] text-clay uppercase">
                {hero.eyebrow}
              </p>
              <h1 className="max-w-[11ch] font-display text-5xl font-semibold leading-[.9] tracking-[-.055em] sm:text-7xl lg:text-[5.5rem]">
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
          {hasHeroImage && (
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
          )}
        </div>
        {hero.metrics.length > 0 && (
          <div className="relative mx-auto mt-12 grid max-w-7xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-bone/10 bg-bone/10 sm:mt-16 sm:grid-cols-3 sm:mx-10 lg:mx-auto">
            {hero.metrics.map((metric) => (
              <div key={metric.label} className="bg-ink/80 px-6 py-5 backdrop-blur">
                <strong className="font-display text-2xl text-bone">{metric.value}</strong>
                <span className="ml-3 text-xs tracking-[.14em] text-bone/55 uppercase">
                  {metric.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  if (direction === "luxury")
    return (
      <section
        id="top"
        className="relative flex min-h-[34rem] items-end overflow-hidden bg-ink text-bone sm:min-h-[38rem]"
      >
        <SiteImage kind="hero" className="absolute inset-0 size-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-linear-to-r from-black/95 via-black/60 to-black/15" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-clay to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-14 sm:px-10 sm:pb-20">
          <Reveal>
            <p className="mb-4 text-xs tracking-[.35em] text-bone/85 uppercase">{hero.eyebrow}</p>
            <h1 className="max-w-[13ch] font-display text-5xl font-medium leading-[.94] tracking-[-.035em] sm:text-7xl">
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
      <section id="top" className="relative overflow-hidden bg-sand/65 py-14 sm:py-20">
        <div className="absolute -left-24 top-10 size-72 rounded-full bg-clay/12 blur-3xl" />
        <div className="absolute -right-24 bottom-0 size-80 rounded-full bg-bone/80 blur-2xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 sm:px-10 lg:grid-cols-[1fr_.88fr]">
          <Reveal>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-clay/20 bg-bone/80 px-4 py-2 text-xs font-semibold tracking-wide text-clay shadow-sm">
              <Sparkles className="size-3.5" /> {hero.eyebrow}
            </p>
            <h1 className="max-w-[14ch] font-display text-4xl font-semibold leading-[1.02] tracking-[-.035em] text-ink sm:text-6xl">
              {hero.headline}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70">{hero.description}</p>
            <div className="mt-8">
              <Actions />
            </div>
            <Metrics className="mt-10 grid max-w-xl grid-cols-3 gap-3 text-ink [&>div]:rounded-2xl [&>div]:bg-bone/80 [&>div]:p-4 [&>div]:shadow-sm" />
          </Reveal>
          <Reveal delay={140}>
            <div className="relative rounded-[2.5rem] bg-bone p-3 shadow-2xl shadow-ink/10 sm:p-4">
              <SiteImage kind="hero" className="aspect-[5/4] w-full rounded-[2rem] object-cover" />
              <div className="absolute -bottom-5 left-6 right-6 flex flex-wrap justify-center gap-2 rounded-2xl border border-ink/8 bg-bone/95 p-3 shadow-xl backdrop-blur">
                {hero.metrics.slice(0, 3).map((metric) => (
                  <span
                    key={metric.label}
                    className="rounded-full bg-sand px-3 py-1.5 text-xs font-semibold text-ink/70"
                  >
                    {metric.label}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    );
  if (direction === "minimal")
    return (
      <section id="top" className="bg-bone">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24">
          <Reveal>
            <div className="grid gap-8 md:grid-cols-[9rem_1fr]">
              <p className="pt-2 text-xs font-semibold tracking-[.18em] text-ink/50 uppercase">
                01 / Introduction
              </p>
              <div>
                <p className="text-xs font-semibold tracking-[.18em] text-clay uppercase">
                  {brand.tagline}
                </p>
                <h1 className="mt-6 max-w-[12ch] font-display text-5xl font-medium leading-[.94] tracking-[-.055em] text-ink sm:text-7xl lg:text-8xl">
                  {hero.headline}
                </h1>
              </div>
            </div>
            <div className="mt-10 grid gap-8 border-y border-ink/15 py-7 md:grid-cols-[9rem_1fr_auto] md:items-center">
              <span className="hidden text-xs text-ink/35 md:block">
                {new Date().getFullYear()}
              </span>
              <p className="max-w-xl text-base leading-relaxed text-ink/65">{hero.description}</p>
              <Actions />
            </div>
            <Metrics className="mt-7 grid grid-cols-2 gap-6 text-ink sm:grid-cols-3" />
          </Reveal>
        </div>
      </section>
    );
  return (
    <section id="top" className="relative overflow-hidden bg-bone">
      <div className="absolute right-0 top-0 h-full w-1/3 bg-sand/40" />
      <div
        className={`relative mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:px-10 sm:py-20 ${hasHeroImage ? "lg:grid-cols-[1.02fr_.98fr] lg:items-center" : "max-w-4xl"}`}
      >
        <div>
          <Reveal>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-clay/20 bg-bone px-4 py-2 text-xs font-semibold tracking-wide text-clay">
              <Check className="size-3.5" />
              {hero.eyebrow}
            </p>
            <h1 className="max-w-[12ch] font-display text-5xl font-medium leading-[.98] tracking-[-.035em] text-ink sm:text-6xl lg:text-7xl">
              {hero.headline}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70">{hero.description}</p>
            <div className="mt-8">
              <Actions />
            </div>
            <Metrics className="mt-10 grid grid-cols-3 gap-4 border-t border-ink/10 pt-6 text-ink" />
          </Reveal>
        </div>
        {hasHeroImage && (
          <Reveal delay={130}>
            <SiteImage
              kind="hero"
              className="aspect-[5/4] w-full rounded-[2rem] object-cover shadow-2xl shadow-ink/15 ring-8 ring-bone"
            />
          </Reveal>
        )}
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
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <SectionTitle eyebrow={services.eyebrow} heading={services.heading} />
          <div className="border-y border-ink/15 bg-sand/20 px-5 sm:px-8">
            {services.items.map((item, index) => (
              <Reveal key={item.number} delay={index * 70}>
                <article className="group grid gap-4 border-b border-ink/15 py-7 last:border-0 md:grid-cols-[6rem_1fr_1.3fr] md:items-center">
                  <span className="font-display text-lg text-clay">{item.number}</span>
                  <h3 className="font-display text-2xl text-ink transition-transform duration-300 group-hover:translate-x-1">
                    {item.title}
                  </h3>
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
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <SectionTitle eyebrow={services.eyebrow} heading={services.heading} />
          <div className="grid gap-4 md:grid-cols-12">
            {services.items.map((item, index) => (
              <Reveal
                key={item.number}
                delay={index * 70}
                className={index === 0 || index === 3 ? "md:col-span-7" : "md:col-span-5"}
              >
                <article
                  className={`group h-full min-h-64 overflow-hidden rounded-2xl p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${index === 0 ? "bg-ink text-bone" : index === 3 ? "bg-clay text-bone" : "bg-sand/70 text-ink"}`}
                >
                  <span className="text-xs font-semibold tracking-[.2em] opacity-55">
                    {item.number}
                  </span>
                  <h3 className="mt-10 font-display text-3xl font-semibold tracking-tight">
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
        <div className="mx-auto max-w-6xl px-6 py-18 sm:px-10 sm:py-24">
          <SectionTitle eyebrow={services.eyebrow} heading={services.heading} centered />
          <div className="grid gap-5 sm:grid-cols-2">
            {services.items.map((item, index) => (
              <Reveal key={item.number} delay={index * 80}>
                <article
                  className={`group h-full rounded-[2rem] p-7 ring-1 ring-clay/10 transition duration-300 hover:-translate-y-1 hover:shadow-xl ${index % 3 === 0 ? "bg-clay text-bone" : index % 3 === 1 ? "bg-sand/70 text-ink" : "bg-ink text-bone"}`}
                >
                  <span
                    className={`grid size-11 place-items-center rounded-2xl text-sm font-bold ${index % 3 === 1 ? "bg-clay text-bone" : "bg-bone/15 text-bone"}`}
                  >
                    {item.number}
                  </span>
                  <h3
                    className={`mt-6 font-display text-2xl ${index % 3 === 1 ? "text-ink" : "text-bone"}`}
                  >
                    {item.title}
                  </h3>
                  <p
                    className={`mt-3 leading-relaxed ${index % 3 === 1 ? "text-ink/65" : "text-bone/72"}`}
                  >
                    {item.body}
                  </p>
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
        <div className="mx-auto max-w-5xl px-6 py-18 sm:px-10 sm:py-24">
          <SectionTitle eyebrow={services.eyebrow} heading={services.heading} />
          <div>
            {services.items.map((item, index) => (
              <Reveal key={item.number} delay={index * 60}>
                <article className="group grid gap-3 border-t border-ink/15 py-7 md:grid-cols-[5rem_1fr_1.2fr]">
                  <span className="text-sm text-ink/45">{item.number}</span>
                  <h3 className="font-display text-2xl text-ink transition-transform duration-300 group-hover:translate-x-1">
                    {item.title}
                  </h3>
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
      <div className="mx-auto max-w-7xl px-6 py-18 sm:px-10 sm:py-24">
        <SectionTitle eyebrow={services.eyebrow} heading={services.heading} />
        <div className="grid gap-5 md:grid-cols-2">
          {services.items.map((item, index) => (
            <Reveal key={item.number} delay={index * 70}>
              <article
                className={`group h-full overflow-hidden rounded-2xl p-8 shadow-sm ring-1 ring-ink/8 transition duration-300 hover:-translate-y-1 hover:shadow-xl ${index === 0 ? "bg-ink text-bone" : "bg-bone text-ink"}`}
              >
                <span
                  className={`text-sm font-semibold ${index === 0 ? "text-clay" : "text-clay"}`}
                >
                  {item.number}
                </span>
                <h3
                  className={`mt-6 font-display text-2xl ${index === 0 ? "text-bone" : "text-ink"}`}
                >
                  {item.title}
                </h3>
                <p
                  className={`mt-3 leading-relaxed ${index === 0 ? "text-bone/70" : "text-ink/65"}`}
                >
                  {item.body}
                </p>
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
  const { about, assets } = useSiteConfig();
  const hasAboutImage = Boolean(assets.about.src);
  if (direction === "modern")
    return (
      <section id="about" className="bg-sand/65">
        <div
          className={`mx-auto grid max-w-7xl gap-8 px-6 py-20 sm:px-10 sm:py-24 ${hasAboutImage ? "lg:grid-cols-12" : "max-w-4xl"}`}
        >
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
          <Reveal delay={100} className={hasAboutImage ? "lg:col-span-7" : ""}>
            {hasAboutImage && (
              <SiteImage kind="about" className="aspect-[16/9] w-full object-cover" />
            )}
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
        <div
          className={`mx-auto grid max-w-7xl gap-12 px-6 sm:px-10 ${hasAboutImage ? "lg:grid-cols-2 lg:items-center" : "max-w-4xl"}`}
        >
          {hasAboutImage && (
            <Reveal>
              <SiteImage kind="about" className="aspect-[4/5] w-full object-cover grayscale" />
            </Reveal>
          )}
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
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-24">
          <div
            className={`grid items-center gap-10 rounded-[3rem] bg-bone p-6 shadow-xl shadow-ink/5 ring-1 ring-clay/10 sm:p-10 ${hasAboutImage ? "md:grid-cols-2" : "mx-auto max-w-2xl"}`}
          >
            {hasAboutImage && (
              <Reveal>
                <SiteImage
                  kind="about"
                  className="aspect-square w-full rounded-[2rem] object-cover"
                />
              </Reveal>
            )}
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
        <div className="mx-auto max-w-4xl px-6 py-20 sm:px-10 sm:py-28">
          <Reveal>
            <div className="grid gap-8 md:grid-cols-[9rem_1fr]">
              <p className="pt-2 text-xs tracking-[.18em] text-ink/45 uppercase">
                02 / {about.eyebrow}
              </p>
              <div>
                <h2 className="font-display text-4xl leading-tight tracking-tight text-ink sm:text-6xl">
                  {about.heading}
                </h2>
                <p className="mt-7 max-w-2xl leading-relaxed text-ink/65">{about.body}</p>
              </div>
            </div>
            <Points
              items={about.points}
              className="mt-10 grid gap-0 border-y border-ink/15 text-sm text-ink/70 md:ml-[9rem] [&_li]:border-b [&_li]:border-ink/10 [&_li]:py-4 [&_li:last-child]:border-0"
            />
          </Reveal>
        </div>
      </section>
    );
  return (
    <section id="about" className="bg-bone">
      <div
        className={`mx-auto grid max-w-7xl gap-12 px-6 py-18 sm:px-10 sm:py-24 ${hasAboutImage ? "md:grid-cols-2 md:items-center" : "max-w-4xl"}`}
      >
        {hasAboutImage && (
          <Reveal>
            <SiteImage kind="about" className="aspect-[4/5] w-full rounded-xl object-cover" />
          </Reveal>
        )}
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
      <Testimonials key="reviews" visualDirection={direction} />,
      <Faq key="faq" visualDirection={direction} />,
      <Contact key="contact" visualDirection={direction} leadCaptureTarget={leadCaptureTarget} />,
    ],
    modern: [
      <VariantServices key="services" direction={direction} />,
      <VariantAbout key="about" direction={direction} />,
      <Contact key="contact" visualDirection={direction} leadCaptureTarget={leadCaptureTarget} />,
      <Testimonials key="reviews" visualDirection={direction} />,
      <Faq key="faq" visualDirection={direction} />,
    ],
    luxury: [
      <VariantAbout key="about" direction={direction} />,
      <VariantServices key="services" direction={direction} />,
      <Testimonials key="reviews" visualDirection={direction} />,
      <Contact key="contact" visualDirection={direction} leadCaptureTarget={leadCaptureTarget} />,
      <Faq key="faq" visualDirection={direction} />,
    ],
    friendly: [
      <VariantServices key="services" direction={direction} />,
      <Testimonials key="reviews" visualDirection={direction} />,
      <VariantAbout key="about" direction={direction} />,
      <Faq key="faq" visualDirection={direction} />,
      <Contact key="contact" visualDirection={direction} leadCaptureTarget={leadCaptureTarget} />,
    ],
    minimal: [
      <VariantServices key="services" direction={direction} />,
      <VariantAbout key="about" direction={direction} />,
      <Contact key="contact" visualDirection={direction} leadCaptureTarget={leadCaptureTarget} />,
      <Faq key="faq" visualDirection={direction} />,
      <Testimonials key="reviews" visualDirection={direction} />,
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
