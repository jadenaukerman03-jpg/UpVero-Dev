import { useSiteConfig } from "@/data/site-config-context";
import { Reveal } from "@/components/Reveal";

export function Services() {
  const { services } = useSiteConfig();
  return (
    <section id="services" className="bg-bone">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-24">
        <Reveal>
          <div className="mb-12 max-w-[40ch]">
            <p className="mb-3 text-sm font-semibold tracking-wide text-clay">
              {services.eyebrow}
            </p>
            <h2 className="font-display text-3xl leading-tight font-medium tracking-tight text-balance text-ink sm:text-4xl">
              {services.heading}
            </h2>
          </div>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-2">
          {services.items.map((service, i) => (
            <Reveal key={service.number} delay={i * 80}>
              <article className="h-full rounded-2xl bg-card p-7 ring-1 ring-ink/5 transition-transform duration-300 hover:-translate-y-0.5">
                <div className="font-display text-5xl leading-none font-medium text-clay/40">
                  {service.number}
                </div>
                <h3 className="mt-5 font-display text-xl font-medium text-ink">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">
                  {service.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
