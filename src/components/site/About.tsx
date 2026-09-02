import { useSiteConfig } from "@/data/site-config-context";
import { Reveal } from "@/components/Reveal";

export function About() {
  const { about, assets } = useSiteConfig();
  return (
    <section id="about" className="bg-sand/60">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
        <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-16">
          <Reveal>
            {assets.about.src ? (
              <img
                src={assets.about.src}
                alt={assets.about.alt}
                width={1080}
                height={1200}
                loading="lazy"
                className="aspect-[4/5] w-full rounded-2xl object-cover outline-1 -outline-offset-1 outline-ink/10"
              />
            ) : (
              <div
                aria-label={assets.about.alt}
                role="img"
                className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-linear-to-br from-sand via-bone to-clay/20 outline-1 -outline-offset-1 outline-ink/10"
              >
                <div className="absolute inset-[12%] rounded-full border border-clay/30" />
                <div className="absolute inset-[23%] rounded-full border border-ink/10" />
                <div className="absolute right-[18%] bottom-[17%] h-[42%] w-[32%] rounded-t-full bg-ink/8" />
              </div>
            )}
          </Reveal>
          <Reveal delay={120}>
            <p className="mb-3 text-sm font-semibold tracking-wide text-clay">{about.eyebrow}</p>
            <h2 className="font-display text-3xl leading-tight font-medium tracking-tight text-balance text-ink sm:text-4xl">
              {about.heading}
            </h2>
            <p className="mt-5 leading-relaxed text-ink/70">{about.body}</p>
            <ul className="mt-8 space-y-4">
              {about.points.map((point) => (
                <li key={point} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-clay" />
                  <span className="text-sm text-ink/80">{point}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
