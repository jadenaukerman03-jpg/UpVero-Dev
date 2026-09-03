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

      {assets.hero.src ? (
        <div className="mx-auto max-w-6xl px-6 pb-4 sm:px-10">
          <Reveal delay={380}>
            <img
              src={assets.hero.src}
              alt={assets.hero.alt}
              width={1920}
              height={1080}
              className="aspect-video w-full rounded-2xl object-cover outline-1 -outline-offset-1 outline-ink/10"
            />
          </Reveal>
        </div>
      ) : null}
    </section>
  );
}
