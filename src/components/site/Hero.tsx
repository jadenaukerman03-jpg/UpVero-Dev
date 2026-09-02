import { useSiteConfig } from "@/data/site-config-context";
import { Reveal } from "@/components/Reveal";

export function Hero() {
  const { assets, hero } = useSiteConfig();
  return (
    <section id="top" className="relative overflow-hidden bg-bone">
      <div className="mx-auto max-w-6xl px-6 pt-14 pb-12 sm:px-10 sm:pt-20">
        <div className="max-w-[26ch]">
          <Reveal>
            <p className="mb-5 text-sm font-semibold tracking-wide text-clay">{hero.eyebrow}</p>
          </Reveal>
          <Reveal delay={90}>
            <h1 className="font-display text-4xl leading-[1.04] font-medium tracking-[-0.02em] text-balance text-ink sm:text-5xl lg:text-6xl">
              {hero.headline}
            </h1>
          </Reveal>
        </div>
        <Reveal delay={180}>
          <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-pretty text-ink/70 sm:text-lg">
            {hero.description}
          </p>
        </Reveal>
        <Reveal delay={260}>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href={hero.primaryCta.href}
              className="rounded-full bg-clay px-6 py-3.5 text-sm font-medium text-bone ring-1 ring-clay transition-colors hover:bg-clay-dark"
            >
              {hero.primaryCta.label}
            </a>
            <a
              href={hero.secondaryCta.href}
              className="rounded-full px-5 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-sand"
            >
              {hero.secondaryCta.label}
            </a>
          </div>
        </Reveal>
        <Reveal delay={340}>
          <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6">
            {hero.metrics.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-2xl font-semibold text-ink">{stat.value}</dd>
                <dd className="mt-1 text-xs tracking-wide text-ink/50 uppercase">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-4 sm:px-10">
        <Reveal delay={380}>
          {assets.hero.src ? (
            <img
              src={assets.hero.src}
              alt={assets.hero.alt}
              width={1920}
              height={1080}
              className="aspect-video w-full rounded-2xl object-cover outline-1 -outline-offset-1 outline-ink/10"
            />
          ) : (
            <div
              aria-label={assets.hero.alt}
              role="img"
              className="relative aspect-video w-full overflow-hidden rounded-2xl bg-linear-to-br from-ink via-ink/90 to-clay outline-1 -outline-offset-1 outline-ink/10"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_26%,color-mix(in_oklch,var(--clay)_62%,transparent),transparent_34%),linear-gradient(125deg,transparent_24%,color-mix(in_oklch,var(--bone)_12%,transparent)_24.5%,transparent_25%)]" />
              <div className="absolute right-[12%] bottom-[14%] left-[12%] h-px bg-bone/35" />
              <div className="absolute right-[12%] bottom-[14%] h-16 w-px bg-bone/35" />
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
