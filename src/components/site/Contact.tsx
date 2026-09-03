import { useState, type FormEvent } from "react";
import { useSiteConfig } from "@/data/site-config-context";
import { Reveal } from "@/components/Reveal";
import { CheckCircle2 } from "lucide-react";

const inputClass =
  "mt-1.5 w-full rounded-lg bg-bone px-4 py-3 text-sm text-ink ring-1 ring-ink/10 placeholder:text-ink/35 focus:ring-2 focus:ring-clay focus:outline-none";

export function Contact() {
  const [sent, setSent] = useState(false);
  const { contact, leadHandling } = useSiteConfig();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <section id="contact" className="bg-ink">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-24">
        <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="mb-3 text-sm font-semibold tracking-wide text-clay">
              {contact.eyebrow}
            </p>
            <h2 className="font-display text-3xl leading-tight font-medium tracking-tight text-balance text-bone sm:text-4xl">
              {contact.heading}
            </h2>
            <p className="mt-5 max-w-[44ch] leading-relaxed text-bone/65">
              {contact.body}
            </p>
            <dl className="mt-9 space-y-5 text-sm">
              {contact.details.map((d) => (
                <div key={d.label} className="flex gap-3">
                  <dt className="w-20 shrink-0 text-bone/50">{d.label}</dt>
                  <dd className="text-bone/85">{d.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-2xl bg-bone p-7 ring-1 ring-ink/5 sm:p-8">
              {sent ? (
                <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
                  <CheckCircle2 className="size-10 text-clay" />
                  <h3 className="mt-4 font-display text-xl font-medium text-ink">
                    {leadHandling.success.heading}
                  </h3>
                  <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-ink/65">
                    {leadHandling.success.body}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="name"
                      className="text-xs font-medium tracking-wide text-ink/70"
                    >
                      {leadHandling.form.name.label}
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder={leadHandling.form.name.placeholder}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-method"
                      className="text-xs font-medium tracking-wide text-ink/70"
                    >
                      {leadHandling.form.contactMethod.label}
                    </label>
                    <input
                      id="contact-method"
                      name="contact"
                      type="text"
                      required
                      placeholder={leadHandling.form.contactMethod.placeholder}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="service"
                      className="text-xs font-medium tracking-wide text-ink/70"
                    >
                      {leadHandling.form.service.label}
                    </label>
                    <select id="service" name="service" className={inputClass}>
                      {contact.serviceOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="notes"
                      className="text-xs font-medium tracking-wide text-ink/70"
                    >
                      {leadHandling.form.notes.label}
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      placeholder={leadHandling.form.notes.placeholder}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-full bg-clay py-3.5 text-sm font-medium text-bone ring-1 ring-clay transition-colors hover:bg-clay-dark"
                  >
                    {leadHandling.form.submitLabel}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
