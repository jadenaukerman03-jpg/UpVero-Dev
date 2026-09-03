import { useSiteConfig } from "@/data/site-config-context";
import { Reveal } from "@/components/Reveal";

export function Testimonials() {
  const { reviews } = useSiteConfig();
  return (
    <section id="reviews" className="bg-bone">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-24">
        <Reveal>
          <div className="mb-12 max-w-[40ch]">
            <p className="mb-3 text-sm font-semibold tracking-wide text-clay">
              {reviews.eyebrow}
            </p>
            <h2 className="font-display text-3xl leading-tight font-medium tracking-tight text-balance text-ink sm:text-4xl">
              {reviews.heading}
            </h2>
          </div>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {reviews.items.map((t, i) => (
            <Reveal key={t.author} delay={i * 90}>
              <figure className="h-full rounded-2xl bg-card p-7 ring-1 ring-ink/5">
                <div
                  className="font-display text-2xl leading-none text-clay"
                  aria-label="5 out of 5 stars"
                >
                  ★★★★★
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-ink/80">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 text-xs text-ink/50">
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
