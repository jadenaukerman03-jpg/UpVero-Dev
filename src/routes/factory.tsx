import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";

import { SitePreview } from "@/components/site/SitePreview";
import { createLead, type LeadInput } from "@/data/leads";
import type { ResearchJobResult } from "@/data/research";
import { validateSiteConfig, type SiteConfig } from "@/data/site";
import { visualStyleOptions, type ImageSelectionResult, type VisualStyle } from "@/data/visuals";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { saveGeneratedWebsite } from "@/services/customer-data";
import { generateSiteConfigFromLead } from "@/services/generate-site-config-from-lead";
import { generateSiteConfigWithAI } from "@/services/generate-site-config-with-ai";
import { sourceImagesForSiteServer } from "@/services/source-images-for-site";
import { researchBusinessServer } from "@/services/research-business";

export const Route = createFileRoute("/factory")({ component: FactoryRoute });

const fieldClass =
  "mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20";

const exampleLead: LeadInput = {
  businessName: "Evergreen Home Roofing",
  industry: "residential roofing",
  phone: "(555) 016-4082",
  email: "hello@evergreenhomeroofing.example",
  address: "115 Oak Street",
  city: "Maplewood",
  state: "IN",
  zipCode: "46032",
  serviceAreas: ["Maplewood", "Westfield", "Carmel"],
  services: ["Roof repair", "Roof replacement", "Storm inspections", "Gutter installation"],
  businessDescription:
    "Evergreen Home Roofing helps homeowners protect their homes with straightforward recommendations and careful, local craftsmanship.",
  yearsInBusiness: 14,
  licenseNumber: "GC #EH-16042",
  googleRating: 4.9,
  reviewCount: 126,
  notes: "Example lead for development preview.",
  source: "development example",
};

function commaSeparated(value: FormDataEntryValue | null): string[] | undefined {
  const entries = String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries : undefined;
}

function optionalValue(value: FormDataEntryValue | null): string | undefined {
  const result = String(value ?? "").trim();
  return result || undefined;
}

function numberValue(value: FormDataEntryValue | null): number | undefined {
  const parsed = Number(optionalValue(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function FactoryRoute() {
  if (!import.meta.env.DEV) {
    return (
      <div className="grid min-h-screen place-items-center bg-sand/40 px-6 text-center text-ink">
        <p className="text-sm text-ink/70">
          The UpVero tool is available in development only.
        </p>
      </div>
    );
  }

  return <FactoryDevelopmentTool />;
}

function FactoryDevelopmentTool() {
  const formRef = useRef<HTMLFormElement>(null);
  const researchFormRef = useRef<HTMLFormElement>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [previewConfig, setPreviewConfig] = useState<SiteConfig | null>(null);
  const [researchResult, setResearchResult] = useState<ResearchJobResult | null>(null);
  const [message, setMessage] = useState("Enter a lead and generate a draft configuration.");
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("professional");
  const [generatedImages, setGeneratedImages] = useState<ImageSelectionResult | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const generateWithAi = useServerFn(generateSiteConfigWithAI);
  const sourceImages = useServerFn(sourceImagesForSiteServer);
  const runResearch = useServerFn(researchBusinessServer);
  const persistWebsite = useServerFn(saveGeneratedWebsite);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  function loadExampleLead() {
    const values: Record<string, string> = {
      businessName: exampleLead.businessName ?? "",
      industry: exampleLead.industry ?? "",
      phone: exampleLead.phone ?? "",
      email: exampleLead.email ?? "",
      address: exampleLead.address ?? "",
      serviceAreas: exampleLead.serviceAreas?.join(", ") ?? "",
      services: exampleLead.services?.join(", ") ?? "",
      businessDescription: exampleLead.businessDescription ?? "",
      notes: exampleLead.notes ?? "",
    };
    setFormValues(values);
    setPreviewConfig(null);
    setGeneratedImages(null);
    setMessage("Example lead loaded. Choose Mock Data or AI generation when ready.");
  }

  function updateFormValue(name: string, value: string) {
    setFormValues((current) => ({ ...current, [name]: value }));
  }

  async function handleResearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = researchFormRef.current;
    if (!form || !form.reportValidity()) return;

    const values = new FormData(form);
    try {
      setIsResearching(true);
      setMessage("Researching the business with enabled providers…");
      const result = await runResearch({
        data: {
          businessName: String(values.get("researchBusinessName") ?? "").trim(),
          city: optionalValue(values.get("researchCity")),
          state: optionalValue(values.get("researchState")),
          websiteUrl: optionalValue(values.get("researchWebsiteUrl")),
          providerMode: values.get("researchProviderMode") === "mock" ? "mock" : "real",
        },
      });
      setResearchResult(result);
      setFormValues({
        businessName: result.normalizedLead.businessName ?? "",
        industry: result.normalizedLead.industry ?? "",
        phone: result.normalizedLead.phone ?? "",
        email: result.normalizedLead.email ?? "",
        address: result.normalizedLead.address ?? "",
        serviceAreas: result.normalizedLead.serviceAreas?.join(", ") ?? "",
        services: result.normalizedLead.services?.join(", ") ?? "",
        businessDescription: result.normalizedLead.businessDescription ?? "",
        notes: result.normalizedLead.notes ?? "",
      });
      setPreviewConfig(null);
      setGeneratedImages(null);
      setMessage(
        result.isMock
          ? "Development/mock research completed. Review and edit the lead details before generating a website."
          : "Research completed. Review and edit the lead details before generating a website.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Research error: ${error.message}`
          : "Research error: unable to complete the research job.",
      );
    } finally {
      setIsResearching(false);
    }
  }

  function generateMockFromInput(input: LeadInput) {
    try {
      const lead = createLead(input);
      setPreviewConfig(generateSiteConfigFromLead(lead));
      setMessage(
        `Generated and validated a mock configuration for ${lead.businessName ?? "this lead"}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate a configuration.");
    }
  }

  function readLeadInput(form: HTMLFormElement): LeadInput {
    const values = new FormData(form);
    return {
      businessName: optionalValue(values.get("businessName")),
      industry: optionalValue(values.get("industry")),
      phone: optionalValue(values.get("phone")),
      email: optionalValue(values.get("email")),
      address: optionalValue(values.get("address")),
      city: optionalValue(values.get("city")),
      state: optionalValue(values.get("state")),
      zipCode: optionalValue(values.get("zipCode")),
      serviceAreas: commaSeparated(values.get("serviceAreas")),
      services: commaSeparated(values.get("services")),
      businessDescription: optionalValue(values.get("businessDescription")),
      notes: optionalValue(values.get("notes")),
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    generateMockFromInput(readLeadInput(event.currentTarget));
  }

  async function handleAiGeneration() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;

    try {
      setIsGeneratingWithAi(true);
      setMessage("Generating website content with OpenAI…");
      const lead = createLead(readLeadInput(form));
      const config = await generateWithAi({ data: lead });
      setPreviewConfig(config);
      setGeneratedImages(null);
      setMessage(`Generated and validated AI content for ${lead.businessName ?? "this lead"}.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate AI content. Use Mock Data or retry.",
      );
    } finally {
      setIsGeneratingWithAi(false);
    }
  }

  async function handleAiGenerationWithImages() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;

    try {
      setIsGeneratingImages(true);
      setGeneratedImages(null);
      setMessage("Generating website content with OpenAI…");
      const lead = createLead(readLeadInput(form));
      const config = await generateWithAi({ data: lead });
      setPreviewConfig(config);
      setMessage("Website content is ready. Searching Pexels…");
      const result = await sourceImages({ data: { lead, style: visualStyle } });
      setGeneratedImages(result);
      const assets = Object.fromEntries(
        result.assets.filter((asset) => asset.src).map((asset) => [asset.section, asset]),
      );
      setPreviewConfig(
        validateSiteConfig({
          ...config,
          seo: assets["hero"]?.src
            ? { ...config.seo, socialImage: assets["hero"].src }
            : config.seo,
          assets: {
            hero: assets["hero"]?.src
              ? { src: assets["hero"].src, alt: assets["hero"].alt }
              : { alt: config.assets.hero.alt },
            about: assets["about"]?.src
              ? { src: assets["about"].src, alt: assets["about"].alt }
              : { alt: config.assets.about.alt },
          },
          assetAttributions: result.assets
            .filter((asset) => asset.sourceType === "pexels" && asset.originalSourceUrl)
            .map((asset) => ({
              label:
                asset.attribution ||
                `Photo provided by ${asset.providerName || "licensed provider"}`,
              href: asset.originalSourceUrl!,
            })),
        }),
      );
      const succeeded = result.assets.filter((asset) => asset.src).length;
      setMessage(
        succeeded === result.assets.length
          ? `Generated AI content and selected ${succeeded} Pexels images.`
          : `Generated AI content. ${succeeded} Pexels images are ready; remaining sections use the image-free design treatment.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to generate the AI website and images.",
      );
    } finally {
      setIsGeneratingImages(false);
    }
  }

  async function savePreviewDraft() {
    if (!previewConfig) return;
    const { data, error } = await createBrowserSupabaseClient().auth.getSession();
    if (error || !data.session) {
      setMessage("Sign in at /account before saving this website draft.");
      return;
    }

    try {
      setIsSavingDraft(true);
      const saved = await persistWebsite({
        data: {
          accessToken: data.session.access_token,
          businessName: previewConfig.brand.name,
          industry: formValues["industry"] || undefined,
          config: previewConfig,
        },
      });
      setMessage(`Saved draft ${saved.id}. It is visible only to your signed-in account.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save the website draft.");
    } finally {
      setIsSavingDraft(false);
    }
  }

  return (
    <div className="min-h-screen bg-sand/40 text-ink">
      <section className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
        <p className="text-sm font-semibold tracking-wide text-clay">Development tool</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          Lead → website configuration
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          This local-only tool creates a validated draft SiteConfig. It does not save leads or
          publish a website.
        </p>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-ink/8">
          <p className="text-sm font-semibold tracking-wide text-clay">Research pipeline</p>
          <h2 className="mt-1 font-display text-xl font-medium">Research a Business</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/65">
            Real provider: OpenAI Web Search. Development/mock research remains available for safe
            testing. Registry, maps, and website-analysis providers are designed for future
            server-side integrations.
          </p>
          <form
            ref={researchFormRef}
            onSubmit={handleResearch}
            className="mt-5 grid gap-4 sm:grid-cols-2"
          >
            <label className="text-sm font-medium sm:col-span-2">
              Business name
              <input
                name="researchBusinessName"
                required
                className={fieldClass}
                placeholder="Acme Roofing"
              />
            </label>
            <label className="text-sm font-medium">
              City <span className="font-normal text-ink/50">(optional)</span>
              <input name="researchCity" className={fieldClass} placeholder="Carmel" />
            </label>
            <label className="text-sm font-medium">
              State <span className="font-normal text-ink/50">(optional)</span>
              <input name="researchState" className={fieldClass} placeholder="IN" />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Website URL <span className="font-normal text-ink/50">(optional)</span>
              <input
                name="researchWebsiteUrl"
                type="url"
                className={fieldClass}
                placeholder="https://example.com"
              />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Research mode
              <select name="researchProviderMode" className={fieldClass} defaultValue="real">
                <option value="real">Real — OpenAI Web Search</option>
                <option value="mock">Development/mock provider</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isResearching}
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bone transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResearching ? "Researching…" : "🔍 Research Business"}
              </button>
            </div>
          </form>

          {researchResult && (
            <div className="mt-5 rounded-lg bg-sand/50 p-4 text-sm text-ink/70">
              <p className="font-medium text-ink">
                Research complete {researchResult.isMock ? "— development/mock data" : ""}
              </p>
              <p className="mt-1">
                Completeness: {researchResult.profile.completeness}% · Sources:{" "}
                {researchResult.profile.sources.length}
              </p>
              <p className="mt-1">{researchResult.profile.additionalNotes}</p>
              <div className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                {[
                  { label: "Business name", evidence: researchResult.profile.businessName },
                  { label: "Industry", evidence: researchResult.profile.industry },
                  { label: "Phone", evidence: researchResult.profile.phone },
                  { label: "Email", evidence: researchResult.profile.email },
                  { label: "Address", evidence: researchResult.profile.address },
                  { label: "Service areas", evidence: researchResult.profile.serviceAreas },
                  { label: "Services", evidence: researchResult.profile.services },
                  { label: "Description", evidence: researchResult.profile.businessDescription },
                  { label: "Website", evidence: researchResult.profile.websiteUrl },
                ].map(({ label, evidence }) => (
                  <p key={label}>
                    <span className="font-medium text-ink">{label}:</span>{" "}
                    {evidence && typeof evidence === "object" && "confidence" in evidence
                      ? `verified (${evidence.confidence})`
                      : "unavailable"}
                  </p>
                ))}
              </div>
              {researchResult.profile.sources.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {researchResult.profile.sources.slice(0, 5).map((source) => (
                    <li key={`${source.sourceUrl ?? source.rawFindings}-${source.timestamp}`}>
                      <span className="font-medium text-ink">{source.confidence} confidence:</span>{" "}
                      {source.sourceUrl ? (
                        <a
                          className="underline"
                          href={source.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {source.pageTitle || source.sourceUrl}
                        </a>
                      ) : (
                        "No source URL available"
                      )}
                      <span className="text-ink/55"> — {source.rawFindings}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-ink/8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-medium">Lead details</h2>
            <button
              type="button"
              onClick={loadExampleLead}
              className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-sand"
            >
              Load example lead
            </button>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium sm:col-span-2">
              Business name
              <input
                name="businessName"
                required
                value={formValues["businessName"] ?? ""}
                onChange={(event) => updateFormValue("businessName", event.target.value)}
                className={fieldClass}
                placeholder="Acme Roofing"
              />
            </label>
            <label className="text-sm font-medium">
              Industry
              <input
                name="industry"
                value={formValues["industry"] ?? ""}
                onChange={(event) => updateFormValue("industry", event.target.value)}
                className={fieldClass}
                placeholder="Residential roofing"
              />
            </label>
            <label className="text-sm font-medium">
              Phone
              <input
                name="phone"
                value={formValues["phone"] ?? ""}
                onChange={(event) => updateFormValue("phone", event.target.value)}
                className={fieldClass}
                placeholder="(555) 010-1234"
              />
            </label>
            <label className="text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                value={formValues["email"] ?? ""}
                onChange={(event) => updateFormValue("email", event.target.value)}
                className={fieldClass}
                placeholder="hello@example.com"
              />
            </label>
            <label className="text-sm font-medium">
              Address
              <input
                name="address"
                value={formValues["address"] ?? ""}
                onChange={(event) => updateFormValue("address", event.target.value)}
                className={fieldClass}
                placeholder="123 Main Street"
              />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Service area <span className="font-normal text-ink/50">(comma-separated)</span>
              <input
                name="serviceAreas"
                value={formValues["serviceAreas"] ?? ""}
                onChange={(event) => updateFormValue("serviceAreas", event.target.value)}
                className={fieldClass}
                placeholder="Carmel, Westfield, Fishers"
              />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Services <span className="font-normal text-ink/50">(comma-separated)</span>
              <input
                name="services"
                value={formValues["services"] ?? ""}
                onChange={(event) => updateFormValue("services", event.target.value)}
                className={fieldClass}
                placeholder="Roof repair, Roof replacement, Gutters"
              />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Business description
              <textarea
                name="businessDescription"
                rows={4}
                value={formValues["businessDescription"] ?? ""}
                onChange={(event) => updateFormValue("businessDescription", event.target.value)}
                className={fieldClass}
                placeholder="What does this business do and how does it help customers?"
              />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Additional notes
              <textarea
                name="notes"
                rows={3}
                value={formValues["notes"] ?? ""}
                onChange={(event) => updateFormValue("notes", event.target.value)}
                className={fieldClass}
                placeholder="Anything useful for the draft configuration…"
              />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Visual direction
              <select
                value={visualStyle}
                onChange={(event) => setVisualStyle(event.target.value as VisualStyle)}
                className={fieldClass}
              >
                {visualStyleOptions.map((style) => (
                  <option key={style} value={style}>
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </option>
                ))}
              </select>
              <span className="mt-1 block font-normal text-ink/55">
                Used only when generating new images; it does not change the website template.
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-bone transition-colors hover:bg-clay-dark"
              >
                {researchResult
                  ? "Generate Website From Research (Mock Data)"
                  : "Generate with Mock Data"}
              </button>
              <button
                type="button"
                onClick={handleAiGeneration}
                disabled={isGeneratingWithAi}
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bone transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingWithAi
                  ? "Generating with AI…"
                  : researchResult
                    ? "Generate Website From Research (AI)"
                    : "Generate with AI"}
              </button>
              <button
                type="button"
                onClick={handleAiGenerationWithImages}
                disabled={isGeneratingWithAi || isGeneratingImages}
                className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-sand disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingImages
                  ? "Searching Pexels…"
                  : "Generate AI Website + Pexels Images"}
              </button>
              <p className="text-sm text-ink/60" role="status">
                {message}
              </p>
            </div>
          </form>
          {generatedImages && (
            <p className="mt-4 text-sm text-ink/60">
              Image sourcing:{" "}
              {generatedImages.assets
                .map((asset) => `${asset.section}: Pexels`)
                .join(" · ")}
            </p>
          )}
        </div>
      </section>

      {previewConfig && (
        <section className="border-t border-ink/10 bg-bone">
          <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
            <p className="text-sm font-semibold tracking-wide text-clay">Generated preview</p>
            <p className="mt-1 text-sm text-ink/65">
              Draft only — demo testimonials must be replaced with verified customer reviews before
              publishing.
            </p>
            <button
              type="button"
              onClick={savePreviewDraft}
              disabled={isSavingDraft}
              className="mt-4 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bone disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingDraft ? "Saving draft…" : "Save private website draft"}
            </button>
          </div>
          <SitePreview config={previewConfig} />
        </section>
      )}
    </div>
  );
}
