import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSiteConfig } from "@/data/site-config-context";
import { Reveal } from "@/components/Reveal";
import { CheckCircle2 } from "lucide-react";
import { submitWebsiteContactLead } from "@/services/website-contact-leads";
import type { DemoVisualDirection } from "@/data/demo-themes";

const inputClass =
  "mt-1.5 w-full rounded-lg bg-bone px-4 py-3 text-sm text-ink ring-1 ring-ink/10 placeholder:text-ink/35 focus:ring-2 focus:ring-clay focus:outline-none";

export type WebsiteLeadCaptureTarget =
  { kind: "private_demo"; token: string } | { kind: "published_website"; websiteId: string };

export function Contact({
  leadCaptureTarget,
  visualDirection,
}: {
  leadCaptureTarget?: WebsiteLeadCaptureTarget | undefined;
  visualDirection?: DemoVisualDirection | undefined;
}) {
  const [sent, setSent] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const { contact, leadHandling } = useSiteConfig();
  const submitLead = useServerFn(submitWebsiteContactLead);
  const modern = visualDirection === "modern";
  const luxury = visualDirection === "luxury";
  const friendly = visualDirection === "friendly";
  const minimal = visualDirection === "minimal";
  const highContrastDark = modern || luxury;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmissionError("");
    if (!leadCaptureTarget) {
      setSubmissionError("This contact form is not accepting inquiries yet.");
      return;
    }

    const values = new FormData(e.currentTarget);
    try {
      const result = await submitLead({
        data: {
          target: leadCaptureTarget,
          name: String(values.get("name") ?? ""),
          contactMethod: String(values.get("contact") ?? ""),
          service: String(values.get("service") ?? ""),
          notes: String(values.get("notes") ?? ""),
          website: String(values.get("website") ?? ""),
        },
      });
      if (result instanceof Response) throw new Error("The inquiry was rejected.");
      setSent(true);
    } catch {
      setSubmissionError("We could not send your message. Please try again shortly.");
    }
  }

  return (
    <section id="contact" className={friendly ? "bg-clay" : minimal ? "bg-sand/35" : "bg-ink"}>
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
        <div
          className={`grid gap-10 md:grid-cols-2 lg:gap-16 ${luxury ? "md:grid-cols-[.85fr_1.15fr]" : ""}`}
        >
          <Reveal>
            <p
              className={`mb-3 text-sm font-semibold tracking-wide ${friendly ? "text-ink/65" : "text-clay"}`}
            >
              {contact.eyebrow}
            </p>
            <h2
              className={`font-display text-3xl leading-tight font-medium tracking-tight text-balance sm:text-5xl ${minimal ? "text-ink" : "text-bone"}`}
            >
              {contact.heading}
            </h2>
            <p
              className={`mt-5 max-w-[44ch] leading-relaxed ${minimal ? "text-ink/72" : friendly ? "text-bone/90" : highContrastDark ? "text-bone/88" : "text-bone/72"}`}
            >
              {contact.body}
            </p>
            <dl className="mt-9 space-y-5 text-sm">
              {contact.details.map((d) => (
                <div
                  key={d.label}
                  className={`flex gap-3 border-b pb-4 ${minimal ? "border-ink/10" : "border-bone/10"}`}
                >
                  <dt
                    className={`w-20 shrink-0 ${minimal ? "text-ink/55" : highContrastDark ? "text-bone/72" : "text-bone/60"}`}
                  >
                    {d.label}
                  </dt>
                  <dd className={minimal ? "text-ink/80" : "text-bone/85"}>{d.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={120}>
            <div
              className={`bg-bone p-7 shadow-2xl shadow-ink/15 ring-1 ring-ink/5 sm:p-8 ${friendly ? "rounded-[2.5rem]" : modern ? "rounded-none" : luxury ? "rounded-t-[4rem]" : "rounded-2xl"}`}
            >
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
                  <div className="sr-only" aria-hidden="true">
                    <label htmlFor="website">Website</label>
                    <input
                      id="website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label htmlFor="name" className="text-xs font-medium tracking-wide text-ink/70">
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
                  {submissionError ? (
                    <p className="text-sm leading-relaxed text-red-700" role="alert">
                      {submissionError}
                    </p>
                  ) : null}
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
