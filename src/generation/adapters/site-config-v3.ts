import type { Lead } from "@/data/leads";
import { validateSiteConfig, type SiteConfig } from "@/data/site";
import type { GenerationQualityMode } from "@/data/site-generation";
import type { SiteSpecV3 } from "@/generation/contracts/site-spec-v3";

function firstBlock(
  spec: SiteSpecV3,
  purpose: SiteSpecV3["architecture"]["pages"][number]["sectionPlan"][number]["purpose"],
) {
  const sectionId = spec.architecture.pages
    .flatMap((page) => page.sectionPlan)
    .find((section) => section.purpose === purpose)?.id;
  return spec.copy.blocks.find((block) => block.id === sectionId);
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function locationFor(lead: Lead) {
  return lead.serviceAreas?.join(", ") || [lead.city, lead.state].filter(Boolean).join(", ");
}

function contactDetails(lead: Lead) {
  return [
    lead.phone ? { label: "Phone", value: lead.phone } : undefined,
    lead.email ? { label: "Email", value: lead.email } : undefined,
    lead.address ? { label: "Address", value: lead.address } : undefined,
  ].filter((entry): entry is { label: string; value: string } => Boolean(entry));
}

export function siteConfigFromV3({
  lead,
  spec,
  qualityMode,
  telemetry,
  revision = 1,
}: {
  lead: Lead;
  spec: SiteSpecV3;
  qualityMode: GenerationQualityMode;
  telemetry: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostCents: number;
    models: string[];
    stages: Array<{
      name: string;
      status: "completed" | "failed";
      durationMs: number;
      attempts: number;
      error?: string;
    }>;
  };
  revision?: number;
}): SiteConfig {
  const name = lead.businessName?.trim() || "Your business";
  const hero = firstBlock(spec, "hero") ?? spec.copy.blocks[0]!;
  const offer =
    firstBlock(spec, "offer") ?? firstBlock(spec, "explanation") ?? spec.copy.blocks[1]!;
  const about = firstBlock(spec, "trust") ?? firstBlock(spec, "process") ?? spec.copy.blocks[2]!;
  const faq = firstBlock(spec, "faq");
  const contact =
    firstBlock(spec, "contact") ?? firstBlock(spec, "conversion") ?? spec.copy.blocks.at(-1)!;
  const firstMedia = spec.media.assets[0];
  const secondaryMedia = spec.media.assets[1] ?? firstMedia;
  const location = locationFor(lead);
  const canonicalUrl = lead.website?.startsWith("https://") ? lead.website : "https://upvero.org/";
  const primaryCta = hero.cta ?? { label: "Start a conversation", href: "#contact" };

  return validateSiteConfig({
    generation: {
      status: "complete",
      qualityMode,
      qualityScore: spec.quality.score,
      estimatedCostCents: Number(telemetry.estimatedCostCents.toFixed(4)),
      actualCostCents: Number(telemetry.estimatedCostCents.toFixed(4)),
      inputTokens: telemetry.inputTokens,
      outputTokens: telemetry.outputTokens,
      models: telemetry.models,
      issues: spec.quality.defects,
      generatedAt: new Date().toISOString(),
      revision,
      variationKey: spec.originality.fingerprint.slice(0, 32),
      stages: telemetry.stages,
    },
    siteSpecV3: spec,
    brand: {
      name,
      shortName: initials(name),
      tagline: spec.copy.brandTagline,
      license: lead.licenseNumber || "",
      phone: lead.phone || "",
      email: lead.email || "",
      address: lead.address || "",
      serviceArea: location,
    },
    seo: {
      title: spec.copy.seoTitle,
      description: spec.copy.seoDescription,
      socialTitle: spec.copy.seoTitle,
      socialDescription: spec.copy.seoDescription,
      canonicalUrl,
    },
    assets: {
      hero: { alt: firstMedia?.alt || `${name} visual story`, brief: firstMedia?.query },
      about: {
        alt: secondaryMedia?.alt || `${name} business environment`,
        brief: secondaryMedia?.query,
      },
      gallery: spec.media.assets
        .slice(2, 6)
        .map((asset) => ({ alt: asset.alt, brief: asset.query })),
    },
    navigation: spec.architecture.pages.map((page) => ({
      label: page.navigationLabel,
      href: page.path === "/" ? "#top" : `#page-${page.id}`,
    })),
    header: { primaryCta },
    hero: {
      eyebrow: hero.eyebrow,
      headline: hero.heading,
      description: hero.body,
      primaryCta,
      secondaryCta: { label: "Explore", href: `#${offer.id}` },
      metrics: [],
    },
    services: {
      eyebrow: offer.eyebrow,
      heading: offer.heading,
      items: offer.items.map((item, index) => ({
        number: String(index + 1).padStart(2, "0"),
        title: item.title,
        body: item.body,
      })),
    },
    about: {
      eyebrow: about.eyebrow,
      heading: about.heading,
      body: about.body,
      points: about.items.map((item) => item.title),
    },
    reviews: { eyebrow: "", heading: "What matters", items: [] },
    faq: {
      eyebrow: faq?.eyebrow || "Questions",
      heading: faq?.heading || "Helpful details",
      items: (faq?.items ?? []).map((item) => ({ question: item.title, answer: item.body })),
    },
    contact: {
      eyebrow: contact.eyebrow,
      heading: contact.heading,
      body: contact.body,
      details: contactDetails(lead),
      serviceOptions: lead.services ?? [],
    },
    leadHandling: {
      formSettings: { submissionMode: "client-only", responseTime: "Response timing varies." },
      form: {
        name: { label: "Name", placeholder: "Your name" },
        contactMethod: { label: "Email or phone", placeholder: "How should we reach you?" },
        service: { label: "What can we help with?" },
        notes: { label: "Details", placeholder: "Tell us what you have in mind." },
        submitLabel: contact.cta?.label || "Send request",
      },
      success: { heading: "Thank you", body: "Your request has been received." },
    },
    footer: { copyrightSuffix: name },
  });
}
