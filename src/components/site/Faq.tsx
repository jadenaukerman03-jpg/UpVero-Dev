import { useState } from "react";
import { useSiteConfig } from "@/data/site-config-context";
import { Reveal } from "@/components/Reveal";
import { Plus } from "lucide-react";
import type { DemoVisualDirection } from "@/data/demo-themes";

export function Faq({ visualDirection }: { visualDirection?: DemoVisualDirection | undefined }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { faq } = useSiteConfig();
  const modern = visualDirection === "modern";
  const friendly = visualDirection === "friendly";
  const luxury = visualDirection === "luxury";
  const minimal = visualDirection === "minimal";
  const sectionClass = modern ? "bg-ink text-bone" : friendly ? "bg-sand/45" : "bg-bone";

  return (
    <section id="faq" className={sectionClass}>
      <div
        className={`mx-auto px-6 py-16 sm:px-10 sm:py-20 ${modern || luxury ? "max-w-5xl" : "max-w-3xl"}`}
      >
        <Reveal>
          <div
            className={`mb-9 ${modern || luxury ? "grid gap-4 md:grid-cols-[1fr_1.3fr] md:items-end" : ""}`}
          >
            <p className="mb-3 text-sm font-semibold tracking-wide text-clay">{faq.eyebrow}</p>
            <h2
              className={`font-display text-3xl leading-tight font-medium tracking-tight text-balance sm:text-5xl ${modern ? "text-bone" : "text-ink"}`}
            >
              {faq.heading}
            </h2>
          </div>
        </Reveal>
        <div
          className={
            friendly
              ? "grid gap-3"
              : modern
                ? "divide-y divide-bone/10 border-y border-bone/10"
                : "divide-y divide-ink/10 border-y border-ink/10"
          }
        >
          {faq.items.map((item, i) => {
            const open = openIndex === i;
            return (
              <div
                key={item.question}
                className={
                  friendly
                    ? "rounded-2xl bg-bone px-5 shadow-sm ring-1 ring-clay/10"
                    : minimal
                      ? "md:grid md:grid-cols-[3rem_1fr]"
                      : ""
                }
              >
                {minimal && (
                  <span className="hidden pt-5 text-xs text-ink/35 md:block">0{i + 1}</span>
                )}
                <div>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay"
                  >
                    <h3
                      className={`font-display text-lg font-medium ${modern ? "text-bone" : "text-ink"}`}
                    >
                      {item.question}
                    </h3>
                    <Plus
                      className={`size-5 shrink-0 text-clay transition-transform duration-300 ${open ? "rotate-45" : ""}`}
                    />
                  </button>
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p
                        className={`pb-5 text-sm leading-relaxed ${modern ? "text-bone/82" : "text-ink/72"}`}
                      >
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
