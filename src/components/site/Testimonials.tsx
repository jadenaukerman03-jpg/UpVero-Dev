import { useSiteConfig } from "@/data/site-config-context";
import { Reveal } from "@/components/Reveal";
import type { DemoVisualDirection } from "@/data/demo-themes";

export function Testimonials({
  visualDirection,
}: {
  visualDirection?: DemoVisualDirection | undefined;
}) {
  const { reviews } = useSiteConfig();
  const modern = visualDirection === "modern";
  const luxury = visualDirection === "luxury";
  const friendly = visualDirection === "friendly";
  const minimal = visualDirection === "minimal";
  const sectionClass = modern
    ? "bg-ink text-bone"
    : friendly
      ? "bg-sand/45"
      : luxury
        ? "bg-sand/30"
        : "bg-bone";
  const cardClass = modern
    ? "border border-bone/10 bg-bone/5 text-bone"
    : friendly
      ? "rounded-[2rem] bg-bone text-ink shadow-lg shadow-ink/5 ring-1 ring-clay/10"
      : luxury
        ? "border-t border-clay/50 bg-transparent text-ink"
        : minimal
          ? "border-t border-ink/15 bg-transparent text-ink"
          : "rounded-2xl bg-card text-ink shadow-sm ring-1 ring-ink/5";

  return (
    <section id="reviews" className={sectionClass}>
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
        <Reveal>
          <div className={`mb-10 max-w-[44ch] ${minimal ? "md:ml-auto" : ""}`}>
            <p className="mb-3 text-sm font-semibold tracking-wide text-clay">{reviews.eyebrow}</p>
            <h2
              className={`font-display text-3xl leading-tight font-medium tracking-tight text-balance sm:text-5xl ${modern ? "text-bone" : "text-ink"}`}
            >
              {reviews.heading}
            </h2>
          </div>
        </Reveal>
        <div className={`grid gap-5 md:grid-cols-3 ${minimal ? "md:gap-8" : ""}`}>
          {reviews.items.map((t, i) => (
            <Reveal key={t.author} delay={i * 90}>
              <figure
                className={`group h-full p-7 transition duration-300 hover:-translate-y-1 ${cardClass}`}
              >
                <div
                  className="font-display text-xl leading-none text-clay"
                  aria-label="5 out of 5 stars"
                >
                  ★★★★★
                </div>
                <blockquote
                  className={`mt-5 text-base leading-relaxed ${modern ? "text-bone/92" : "text-ink/80"}`}
                >
                  “{t.quote}”
                </blockquote>
                <figcaption
                  className={`mt-6 text-xs ${modern ? "text-bone/72" : luxury ? "text-ink/68" : "text-ink/50"}`}
                >
                  {t.author} · {t.place}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
