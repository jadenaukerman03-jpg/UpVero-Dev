import aboutImage from "@/assets/about-crew.jpg";
import heroImage from "@/assets/hero-roof.jpg";
import type { Lead } from "@/data/leads";
import { validateSiteConfig, type SiteConfig } from "@/data/site";

const DEFAULT_INDUSTRY = "local service";
const DEFAULT_SERVICES = [
  "Consultation",
  "Professional service",
  "Project support",
  "Ongoing care",
];

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

function createFaq(industry: string, services: string[]) {
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
        "We serve our local service area and will confirm availability for your address before scheduling.",
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
  const services = list(lead.services, DEFAULT_SERVICES);
  const serviceArea = list(lead.serviceAreas, ["your local area"]).join(", ");
  const cityAndState = [lead.city, lead.state].filter(Boolean).join(", ");
  const address = text(lead.address, cityAndState || `Serving ${serviceArea}`);
  const phone = text(lead.phone, "Call for availability");
  const email = text(lead.email, "Contact us for details");
  const description = text(
    lead.businessDescription,
    `${name} provides dependable ${industry} for customers throughout ${serviceArea}.`,
  );
  const shortIndustry = industry.toLowerCase();
  const slug = slugify(name);
  const yearsMetric = lead.yearsInBusiness
    ? { value: `${lead.yearsInBusiness}+`, label: "Years in business" }
    : { value: "Local", label: "Service team" };
  const ratingMetric = lead.googleRating
    ? { value: `${lead.googleRating} / 5`, label: `${lead.reviewCount ?? ""} reviews`.trim() }
    : { value: "Clear", label: "Next steps" };

  return validateSiteConfig({
    brand: {
      name,
      shortName: abbreviate(name),
      tagline: `${industry} · Serving ${serviceArea}`,
      license: text(lead.licenseNumber, "License information available on request"),
      phone,
      email,
      address,
      serviceArea,
    },
    seo: {
      title: `${name} — ${industry} in ${serviceArea}`,
      description: `${description} Contact ${name} for ${shortIndustry} in ${serviceArea}.`,
      socialTitle: `${name} — ${industry} in ${serviceArea}`,
      socialDescription: `${description} Contact ${name} for ${shortIndustry} in ${serviceArea}.`,
      canonicalUrl: `https://${slug}.example/`,
      socialImage: heroImage,
    },
    assets: {
      hero: { alt: `${name} ${industry} project` },
      about: { alt: `${name} professional business environment` },
    },
    navigation: [
      { label: "Services", href: "#services" },
      { label: "About", href: "#about" },
      { label: "Reviews", href: "#reviews" },
      { label: "FAQ", href: "#faq" },
    ],
    header: { primaryCta: { label: "Request information", href: "#contact" } },
    hero: {
      eyebrow: `${industry} · Serving ${serviceArea}`,
      headline: `${name} makes ${shortIndustry} straightforward.`,
      description,
      primaryCta: { label: "Request a consultation", href: "#contact" },
      secondaryCta: { label: "Explore services", href: "#services" },
      metrics: [yearsMetric, ratingMetric, { value: "Local", label: serviceArea }],
    },
    services: {
      eyebrow: "What we offer",
      heading: `${industry} tailored to your needs`,
      items: services.slice(0, 4).map((service, index) => ({
        number: String(index + 1).padStart(2, "0"),
        title: service,
        body: `${service} from ${name}, with clear communication from the first conversation through the next step.`,
      })),
    },
    about: {
      eyebrow: "Why choose us",
      heading: `A local team for your ${shortIndustry} needs`,
      body: description,
      points: [
        "A clear conversation before work begins",
        "Practical recommendations based on your needs",
        `Service across ${serviceArea}`,
      ],
    },
    reviews: {
      eyebrow: "Demo content only",
      heading: "Placeholder testimonials to replace before publishing",
      items: [1, 2, 3].map((number) => ({
        quote:
          "Demo testimonial placeholder — replace this with a verified customer review before publishing.",
        author: `Demo review ${number}`,
        place: "Illustrative content only",
      })),
    },
    faq: {
      eyebrow: "Helpful details",
      heading: `Questions about ${industry}`,
      items: createFaq(industry, services),
    },
    contact: {
      eyebrow: "Get in touch",
      heading: `Talk with ${name}`,
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
