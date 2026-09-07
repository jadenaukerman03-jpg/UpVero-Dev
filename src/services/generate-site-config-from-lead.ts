import type { Lead } from "@/data/leads";
import { validateSiteConfig, type SiteConfig } from "@/data/site";

const DEFAULT_INDUSTRY = "independent business";
const DEFAULT_SERVICES = [
  "Consultation",
  "Professional service",
  "Project support",
  "Ongoing care",
];

type CopyConcept = {
  headline: string;
  servicesHeading: string;
  aboutHeading: string;
  contactHeading: string;
  experienceHeading: string;
  experienceItems: Array<{ quote: string; author: string; place: string }>;
  fallbackServices?: string[];
};

function text(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function list(values: string[] | undefined, fallback: string[]): string[] {
  const cleaned = values?.map((value) => value.trim()).filter(Boolean) ?? [];
  return cleaned.length > 0 ? cleaned : fallback;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "new-local-business";
}

function abbreviate(value: string): string {
  return (
    value
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "B"
  );
}

function serviceAreaFor(lead: Lead): string {
  const suppliedAreas = lead.serviceAreas?.map((area) => area.trim()).filter(Boolean) ?? [];
  if (suppliedAreas.length > 0) return suppliedAreas.join(", ");
  const location = [lead.city?.trim(), lead.state?.trim()].filter(Boolean).join(", ");
  return location || "your area";
}

const STANDARD_EXPERIENCE_ITEMS = [
  {
    quote: "Clear information from the first conversation through the next step.",
    author: "Straightforward guidance",
    place: "A simple way to get started",
  },
  {
    quote: "Options explained in a way that makes the decision easier.",
    author: "Practical support",
    place: "Focused on what matters to you",
  },
  {
    quote: "A service experience shaped around your goals.",
    author: "Personal attention",
    place: "Built for the work ahead",
  },
];

/** Safe neutral copy only used while a server-side AI request is unavailable. */
function getCopyConcept(industry: string): CopyConcept {
  return {
    headline: "A thoughtful next step starts here.",
    servicesHeading: "How we can help",
    aboutHeading: `Built around your ${industry.toLowerCase()} goals`,
    contactHeading: "Let’s talk about your next step",
    experienceHeading: "What to expect from the first conversation",
    experienceItems: STANDARD_EXPERIENCE_ITEMS,
  };
}

function createFaq(industry: string, services: string[], serviceArea: string) {
  const primaryService = services[0] ?? "services";
  return [
    {
      question: `What ${primaryService.toLowerCase()} options do you offer?`,
      answer: `We start with a conversation about your needs, then explain the ${industry} options that best fit your project.`,
    },
    {
      question: "How do I get started?",
      answer:
        "Send us a few details through the form and our team will follow up with a clear next step.",
    },
    {
      question: "Which areas do you serve?",
      answer:
        `We serve ${serviceArea} and can confirm availability for your plans before scheduling.`,
    },
    {
      question: "What should I expect after I reach out?",
      answer:
        "You will receive a response within one business day so we can learn about the project and help you plan.",
    },
  ];
}

/**
 * Deterministic implementation for the lead-to-site pipeline. Its return is
 * runtime-validated so an AI implementation can replace this function later.
 */
export function generateSiteConfigFromLead(lead: Lead): SiteConfig {
  const name = text(lead.businessName, "Your Local Business");
  const industry = text(lead.industry, DEFAULT_INDUSTRY);
  const serviceType = industry;
  const concept = getCopyConcept(industry);
  const services = list(lead.services, concept.fallbackServices ?? DEFAULT_SERVICES);
  const serviceArea = serviceAreaFor(lead);
  const cityAndState = [lead.city, lead.state].filter(Boolean).join(", ");
  const address = text(lead.address, cityAndState || `Serving ${serviceArea}`);
  const phone = text(lead.phone, "Call for availability");
  const email = text(lead.email, "Contact us for details");
  const description = text(
    lead.businessDescription,
    `${name} provides dependable ${industry} for customers throughout ${serviceArea}.`,
  );
  const shortIndustry = serviceType.toLowerCase();
  const slug = slugify(name);
  const yearsMetric = lead.yearsInBusiness
    ? { value: `${lead.yearsInBusiness}+`, label: "Years in business" }
    : { value: "Personal", label: "Guidance" };
  const ratingMetric = lead.googleRating
    ? { value: `${lead.googleRating} / 5`, label: `${lead.reviewCount ?? ""} reviews`.trim() }
    : { value: "Clear", label: "Next steps" };

  return validateSiteConfig({
    brand: {
      name,
      shortName: abbreviate(name),
      tagline: `${serviceType} · Serving ${serviceArea}`,
      license: text(lead.licenseNumber, "License information available on request"),
      phone,
      email,
      address,
      serviceArea,
    },
    seo: {
      title: `${name} — ${serviceType} in ${serviceArea}`,
      description: `${description} Contact ${name} for ${shortIndustry} in ${serviceArea}.`,
      socialTitle: `${name} — ${serviceType} in ${serviceArea}`,
      socialDescription: `${description} Contact ${name} for ${shortIndustry} in ${serviceArea}.`,
      canonicalUrl: `https://${slug}.example/`,
    },
    assets: {
      hero: { alt: `${name} ${industry} project` },
      about: { alt: `${name} professional business environment` },
    },
    navigation: [
      { label: "Services", href: "#services" },
      { label: "About", href: "#about" },
      { label: "What to expect", href: "#reviews" },
      { label: "FAQ", href: "#faq" },
    ],
    header: { primaryCta: { label: "Request information", href: "#contact" } },
    hero: {
      eyebrow: `${serviceType} · Serving ${serviceArea}`,
      headline: concept.headline,
      description,
      primaryCta: { label: "Request a consultation", href: "#contact" },
      secondaryCta: { label: "Explore services", href: "#services" },
      metrics: [yearsMetric, ratingMetric, { value: "Serving", label: serviceArea }],
    },
    services: {
      eyebrow: "What we offer",
      heading: concept.servicesHeading,
      items: services.slice(0, 4).map((service, index) => ({
        number: String(index + 1).padStart(2, "0"),
        title: service,
        body: `${service} shaped around your goals, with clear communication from the first conversation through the next step.`,
      })),
    },
    about: {
      eyebrow: "Why choose us",
      heading: concept.aboutHeading,
      body: description,
      points: [
        "A clear conversation before work begins",
        "Practical recommendations based on your needs",
        `Service across ${serviceArea}`,
      ],
    },
    reviews: {
      eyebrow: "What to expect",
      heading: concept.experienceHeading,
      items: concept.experienceItems,
    },
    faq: {
      eyebrow: "Helpful details",
      heading: `Questions about ${industry}`,
      items: createFaq(serviceType, services, serviceArea),
    },
    contact: {
      eyebrow: "Get in touch",
      heading: concept.contactHeading,
      body: `Share a few details and the ${name} team will respond within one business day.`,
      details: [
        { label: "Phone", value: phone },
        { label: "Email", value: email },
        { label: "Area", value: serviceArea },
        { label: "Office", value: address },
      ],
      serviceOptions: services,
    },
    leadHandling: {
      formSettings: { submissionMode: "client-only", responseTime: "within one business day" },
      form: {
        name: { label: "Your name", placeholder: "Your full name" },
        contactMethod: { label: "Phone or email", placeholder: "The best way to reach you" },
        service: { label: "What can we help with?" },
        notes: { label: "Project details", placeholder: "Tell us a little about what you need…" },
        submitLabel: `Contact ${name}`,
      },
      success: {
        heading: "Thanks — we received your request.",
        body: `The ${name} team will be in touch within one business day.`,
      },
    },
    footer: { copyrightSuffix: "— Draft site configuration." },
  });
}
