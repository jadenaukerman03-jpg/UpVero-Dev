import { useState } from "react";
import { useSiteConfig } from "@/data/site-config-context";
import { Reveal } from "@/components/Reveal";
import { Plus } from "lucide-react";

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { faq } = useSiteConfig();

  return (
    <section id="faq" className="bg-bone">
      <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10 sm:py-28">
        <Reveal>
          <div className="mb-10">
            <p className="mb-3 text-sm font-semibold tracking-wide text-clay">
              {faq.eyebrow}
            </p>
            <h2 className="font-display text-3xl leading-tight font-medium tracking-tight text-balance text-ink sm:text-4xl">
              {faq.heading}
            </h2>
          </div>
        </Reveal>
        <div className="divide-y divide-ink/8 border-y border-ink/8">
          {faq.items.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <h3 className="font-display text-lg font-medium text-ink">
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
                    <p className="pb-5 text-sm leading-relaxed text-ink/65">
                      {item.answer}
                    </p>
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
