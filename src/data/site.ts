import { z } from "zod";

export type Cta = { label: string; href: string };

export type NavigationItem = { label: string; href: string };

export type SiteConfigKey = "vantageRoofing" | "summitPeakRoofing";

export type SiteConfig = {
  brand: {
    name: string;
    shortName: string;
    tagline: string;
    license: string;
    phone: string;
    email: string;
    address: string;
    serviceArea: string;
  };
  seo: {
    title: string;
    description: string;
    socialTitle: string;
    socialDescription: string;
    canonicalUrl: string;
    socialImage?: string;
  };
  assets: {
    hero: { src?: string; alt: string };
    about: { src?: string; alt: string };
  };
  /** Present only when a selected licensed asset requires a public attribution link. */
  assetAttributions?: Array<{ label: string; href: string }>;
  navigation: NavigationItem[];
  header: { primaryCta: Cta };
  hero: {
    eyebrow: string;
    headline: string;
    description: string;
    primaryCta: Cta;
    secondaryCta: Cta;
    metrics: Array<{ value: string; label: string }>;
  };
  services: {
    eyebrow: string;
    heading: string;
    items: Array<{ number: string; title: string; body: string }>;
  };
  about: { eyebrow: string; heading: string; body: string; points: string[] };
  reviews: {
    eyebrow: string;
    heading: string;
    items: Array<{ quote: string; author: string; place: string }>;
  };
  faq: {
    eyebrow: string;
    heading: string;
    items: Array<{ question: string; answer: string }>;
  };
  contact: {
    eyebrow: string;
    heading: string;
    body: string;
    details: Array<{ label: string; value: string }>;
    serviceOptions: string[];
  };
  leadHandling: {
    formSettings: {
      submissionMode: "client-only";
      responseTime: string;
    };
    form: {
      name: { label: string; placeholder: string };
      contactMethod: { label: string; placeholder: string };
      service: { label: string };
      notes: { label: string; placeholder: string };
      submitLabel: string;
    };
    success: { heading: string; body: string };
  };
  footer: { copyrightSuffix: string };
};

const ctaSchema = z.object({ label: z.string().min(1), href: z.string().min(1) });

/** Runtime validation for generated or eventually AI-provided site configurations. */
export const siteConfigSchema = z.object({
  brand: z.object({
    name: z.string().min(1),
    shortName: z.string().min(1),
    tagline: z.string(),
    license: z.string(),
    phone: z.string(),
    email: z.string(),
    address: z.string(),
    serviceArea: z.string(),
  }),
  seo: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    socialTitle: z.string().min(1),
    socialDescription: z.string().min(1),
    canonicalUrl: z.string().min(1),
    socialImage: z.string().min(1).optional(),
  }),
  assets: z.object({
    hero: z.object({ src: z.string().min(1).optional(), alt: z.string().min(1) }),
    about: z.object({ src: z.string().min(1).optional(), alt: z.string().min(1) }),
  }),
  assetAttributions: z
    .array(z.object({ label: z.string().min(1), href: z.string().url() }))
    .optional(),
  navigation: z.array(z.object({ label: z.string().min(1), href: z.string().min(1) })),
  header: z.object({ primaryCta: ctaSchema }),
  hero: z.object({
    eyebrow: z.string(),
    headline: z.string().min(1),
    description: z.string().min(1),
    primaryCta: ctaSchema,
    secondaryCta: ctaSchema,
    metrics: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })),
  }),
  services: z.object({
    eyebrow: z.string(),
    heading: z.string().min(1),
    items: z.array(
      z.object({ number: z.string().min(1), title: z.string().min(1), body: z.string().min(1) }),
    ),
  }),
  about: z.object({
    eyebrow: z.string(),
    heading: z.string().min(1),
    body: z.string().min(1),
    points: z.array(z.string().min(1)),
  }),
  reviews: z.object({
    eyebrow: z.string(),
    heading: z.string().min(1),
    items: z.array(
      z.object({ quote: z.string().min(1), author: z.string().min(1), place: z.string().min(1) }),
    ),
  }),
  faq: z.object({
    eyebrow: z.string(),
    heading: z.string().min(1),
    items: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })),
  }),
  contact: z.object({
    eyebrow: z.string(),
    heading: z.string().min(1),
    body: z.string().min(1),
    details: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })),
    serviceOptions: z.array(z.string().min(1)),
  }),
  leadHandling: z.object({
    formSettings: z.object({
      submissionMode: z.literal("client-only"),
      responseTime: z.string().min(1),
    }),
    form: z.object({
      name: z.object({ label: z.string().min(1), placeholder: z.string() }),
      contactMethod: z.object({ label: z.string().min(1), placeholder: z.string() }),
      service: z.object({ label: z.string().min(1) }),
      notes: z.object({ label: z.string().min(1), placeholder: z.string() }),
      submitLabel: z.string().min(1),
    }),
    success: z.object({ heading: z.string().min(1), body: z.string().min(1) }),
  }),
  footer: z.object({ copyrightSuffix: z.string() }),
});

export function validateSiteConfig(config: unknown): SiteConfig {
  return siteConfigSchema.parse(config) as SiteConfig;
}

const vantageBrand: SiteConfig["brand"] = {
  name: "Vantage Roofing Co.",
  shortName: "V",
  tagline: "Licensed & insured · Serving the Tri-County area since 2009",
  license: "Licensed GC #RC-4472 · Bonded & insured",
  phone: "(555) 018-2240",
  email: "hello@vantageroofing.example",
  address: "418 Harbor Ave, Suite 2",
  serviceArea: "Tri-County area",
};

/**
 * The currently published site. Its values preserve the existing Vantage
 * Roofing experience exactly and provide the shape for future businesses.
 */
export const defaultSiteConfig = {
  brand: vantageBrand,
  seo: {
    title: "Vantage Roofing Co. — Roofs Built to Outlast the Weather",
    description:
      "Roof repair, replacement, inspection and gutters from a licensed local crew. Written estimates and a 25-year workmanship warranty.",
    socialTitle: "Vantage Roofing Co. — Roofs Built to Outlast the Weather",
    socialDescription:
      "Roof repair, replacement, inspection and gutters from a licensed local crew. Written estimates and a 25-year workmanship warranty.",
    canonicalUrl: "https://vantageroofing.example/",
  },
  assets: {
    hero: {
      alt: "Golden hour view of a freshly installed standing-seam metal roof",
    },
    about: {
      alt: "Roofer in a hi-vis vest installing shingles in warm daylight",
    },
  },
  navigation: [
    { label: "Services", href: "#services" },
    { label: "Craftsmanship", href: "#about" },
    { label: "Reviews", href: "#reviews" },
    { label: "FAQ", href: "#faq" },
  ],
  header: { primaryCta: { label: "Get a Quote", href: "#contact" } },
  hero: {
    eyebrow: vantageBrand.tagline,
    headline: "Roofs built to outlast the weather.",
    description:
      "From same-day storm repair to full architectural shingle installs, our crew shows up on time, works clean, and stands behind every nail.",
    primaryCta: { label: "Request a free estimate", href: "#contact" },
    secondaryCta: { label: "Explore services", href: "#services" },
    metrics: [
      { value: "1,400+", label: "Roofs completed" },
      { value: "25-yr", label: "Workmanship warranty" },
      { value: "4.9 / 5", label: "980 local reviews" },
    ],
  },
  services: {
    eyebrow: "What we do",
    heading: "Four services, one standard of care",
    items: [
      {
        number: "01",
        title: "Roof Repair",
        body: "Same-week patching for leaks, torn shingles, and debris damage — no upsell, just the fix.",
      },
      {
        number: "02",
        title: "Full Replacement",
        body: "Complete tear-offs and installs with architectural shingles, metal, or synthetic slate.",
      },
      {
        number: "03",
        title: "Inspection",
        body: "A 40-point report with photos so you know exactly what your roof needs — and what it doesn't.",
      },
      {
        number: "04",
        title: "Gutters & Drainage",
        body: "Seamless gutters, downspout extensions, and guards that keep water off your foundation.",
      },
    ],
  },
  about: {
    eyebrow: "Why homeowners stay",
    heading: "A crew that treats your home like its own",
    body: "We're not a national franchise. Every project is led by a foreman who's been on the roof for a decade, and we back our work with a written 25-year warranty.",
    points: [
      "Written estimates — no surprises, no pressure",
      "Daily cleanup and a locked job site",
      "Direct line to the project lead, not a call center",
    ],
  },
  reviews: {
    eyebrow: "In their words",
    heading: "Neighbors who called their neighbors",
    items: [
      {
        quote:
          "They finished two days early and the driveway was swept clean. Honest people in a shoddy trade.",
        author: "Marta R.",
        place: "Elmwood",
      },
      {
        quote:
          "After the storm, they were on our roof the next morning. The repair still holds a year later.",
        author: "Devon P.",
        place: "Cedar Falls",
      },
      {
        quote:
          "Clear quote, no pushiness, and the gutters finally drain the way they should. Would book again.",
        author: "Priya S.",
        place: "Riverside",
      },
    ],
  },
  faq: {
    eyebrow: "Good to know",
    heading: "Questions we get a lot",
    items: [
      {
        question: "How long does a full roof replacement take?",
        answer:
          "Most single-family installs are done in one to two days. We start early and we're off the site by late afternoon.",
      },
      {
        question: "Do you handle insurance claims?",
        answer:
          "Yes. We document damage with photos, walk you through the adjuster visit, and keep the paperwork off your plate.",
      },
      {
        question: "What does the warranty actually cover?",
        answer:
          "Our written 25-year workmanship warranty covers leaks from installation, on top of the manufacturer's material warranty.",
      },
      {
        question: "What should I expect on the day?",
        answer:
          "A foreman coordinates everything. Keep pets and cars clear of the roof line; we'll protect the landscaping and clean up daily.",
      },
    ],
  },
  contact: {
    eyebrow: "Get in touch",
    heading: "Tell us about your roof",
    body: "Send a few details and a foreman will call you back within one business day with a clear next step.",
    details: [
      { label: "Phone", value: vantageBrand.phone },
      { label: "Email", value: vantageBrand.email },
      { label: "Hours", value: "Mon–Sat · 7am to 5pm" },
      { label: "Office", value: vantageBrand.address },
    ],
    serviceOptions: ["Roof repair", "Full replacement", "Inspection", "Gutters & drainage"],
  },
  leadHandling: {
    formSettings: {
      submissionMode: "client-only",
      responseTime: "within one business day",
    },
    form: {
      name: { label: "Full name", placeholder: "Jordan Alvarez" },
      contactMethod: {
        label: "Phone or email",
        placeholder: "The best way to reach you",
      },
      service: { label: "What do you need?" },
      notes: {
        label: "Project notes",
        placeholder: "Rough size, any leaks, insurance involved…",
      },
      submitLabel: "Send my request",
    },
    success: {
      heading: "Thanks — we got it.",
      body: "A foreman will call you back within one business day.",
    },
  },
  footer: { copyrightSuffix: "— Template placeholder. All copy swappable." },
} satisfies SiteConfig;

const summitPeakBrand: SiteConfig["brand"] = {
  name: "Summit Peak Roofing",
  shortName: "S",
  tagline: "Locally owned · Protecting homes across the High Valley since 2012",
  license: "Licensed GC #SP-82941 · Fully insured",
  phone: "(555) 014-7826",
  email: "hello@summitpeakroofing.example",
  address: "72 Alpine Way, Suite 140",
  serviceArea: "High Valley, Pine Ridge & Northshore",
};

/** A second complete tenant configuration used to prove the shared template. */
export const summitPeakRoofingConfig = {
  brand: summitPeakBrand,
  seo: {
    title: "Summit Peak Roofing — Protection Above Everything",
    description:
      "Roof repair, replacement, inspections, and gutter systems for homeowners across the High Valley. Clear recommendations and dependable local crews.",
    socialTitle: "Summit Peak Roofing — Protection Above Everything",
    socialDescription:
      "Roof repair, replacement, inspections, and gutter systems for homeowners across the High Valley. Clear recommendations and dependable local crews.",
    canonicalUrl: "https://summitpeakroofing.example/",
  },
  assets: {
    hero: {
      alt: "Sunset over a durable metal roof installed by Summit Peak Roofing",
    },
    about: {
      alt: "Summit Peak Roofing crew member installing shingles on a residential home",
    },
  },
  navigation: [
    { label: "Roofing", href: "#services" },
    { label: "Our Approach", href: "#about" },
    { label: "Customer Stories", href: "#reviews" },
    { label: "Questions", href: "#faq" },
  ],
  header: { primaryCta: { label: "Schedule an inspection", href: "#contact" } },
  hero: {
    eyebrow: summitPeakBrand.tagline,
    headline: "Protection above everything.",
    description:
      "From wind-damaged shingles to complete roof replacements, Summit Peak brings practical guidance, careful craftsmanship, and a crew you can reach when you need us.",
    primaryCta: { label: "Schedule a roof check", href: "#contact" },
    secondaryCta: { label: "See our roofing work", href: "#services" },
    metrics: [
      { value: "980+", label: "Homes protected" },
      { value: "20-yr", label: "Labor warranty" },
      { value: "4.8 / 5", label: "410 verified reviews" },
    ],
  },
  services: {
    eyebrow: "Built for every season",
    heading: "Roofing solutions with a clear next step",
    items: [
      {
        number: "01",
        title: "Storm Repair",
        body: "Fast, photo-documented repairs for lifted shingles, leaks, and wind damage before the next weather system arrives.",
      },
      {
        number: "02",
        title: "Roof Replacement",
        body: "Thoughtful tear-offs and replacement systems matched to your home, budget, and the weather where you live.",
      },
      {
        number: "03",
        title: "Roof Health Check",
        body: "A straightforward inspection with clear photos, priority notes, and zero-pressure recommendations.",
      },
      {
        number: "04",
        title: "Gutter Systems",
        body: "Seamless gutters and guards designed to move mountain rain and snowmelt safely away from your home.",
      },
    ],
  },
  about: {
    eyebrow: "The Summit Peak difference",
    heading: "Good roofs start with good communication",
    body: "We believe homeowners deserve a roofing partner who explains the options, respects the property, and follows through after the crew leaves. That is how we have earned repeat calls across the High Valley.",
    points: [
      "A detailed scope before work begins",
      "Site protection and magnetic cleanup every day",
      "One project coordinator from estimate to final walk-through",
    ],
  },
  reviews: {
    eyebrow: "From our neighbors",
    heading: "The kind of service people pass along",
    items: [
      {
        quote:
          "They explained the storm damage in plain English and had the leak sealed before the weekend rain. The whole crew was a pleasure.",
        author: "Lena M.",
        place: "Pine Ridge",
      },
      {
        quote:
          "Our new roof looks great, and the project manager kept us informed from the first estimate to the final cleanup.",
        author: "Marcus T.",
        place: "High Valley",
      },
      {
        quote:
          "No scare tactics, just clear options and excellent work. They even found a loose gutter bracket and fixed it on the spot.",
        author: "Avery K.",
        place: "Northshore",
      },
    ],
  },
  faq: {
    eyebrow: "Plan with confidence",
    heading: "Answers before you book",
    items: [
      {
        question: "Can you inspect a roof after a windstorm?",
        answer:
          "Yes. We document visible damage, identify immediate concerns, and give you a clear recommendation for repair or follow-up monitoring.",
      },
      {
        question: "How do I know whether I need repair or replacement?",
        answer:
          "We look at the roof's age, the extent of the damage, ventilation, and the condition of the surrounding materials before recommending a path.",
      },
      {
        question: "Do you offer financing options?",
        answer:
          "We can discuss available payment options during your estimate so you can choose a plan that works for your project and timeline.",
      },
      {
        question: "Will my landscaping be protected?",
        answer:
          "Absolutely. We protect work areas, stage materials carefully, and complete a magnetic nail sweep and site walk-through before we leave.",
      },
    ],
  },
  contact: {
    eyebrow: "Start with a conversation",
    heading: "Let’s take a look at your roof",
    body: "Tell us what you are seeing and our local team will reach out within one business day to help you plan the right next step.",
    details: [
      { label: "Phone", value: summitPeakBrand.phone },
      { label: "Email", value: summitPeakBrand.email },
      { label: "Hours", value: "Mon–Fri · 8am to 5:30pm" },
      { label: "Office", value: summitPeakBrand.address },
    ],
    serviceOptions: ["Storm repair", "Roof replacement", "Roof health check", "Gutter systems"],
  },
  leadHandling: {
    formSettings: {
      submissionMode: "client-only",
      responseTime: "within one business day",
    },
    form: {
      name: { label: "Your name", placeholder: "Taylor Morgan" },
      contactMethod: {
        label: "Best phone or email",
        placeholder: "How should our team reach you?",
      },
      service: { label: "How can we help?" },
      notes: {
        label: "What is going on?",
        placeholder: "Tell us about the roof, timing, or any recent weather damage…",
      },
      submitLabel: "Request my roof check",
    },
    success: {
      heading: "Your request is on its way.",
      body: "A Summit Peak team member will be in touch within one business day.",
    },
  },
  footer: { copyrightSuffix: "— Local roofing, thoughtfully done." },
} satisfies SiteConfig;

/**
 * Add future configurations here. Tenant selection (hostname, database, etc.)
 * deliberately remains outside this first data-only refactor.
 */
export const siteConfigs: Record<SiteConfigKey, SiteConfig> = {
  vantageRoofing: defaultSiteConfig,
  summitPeakRoofing: summitPeakRoofingConfig,
};
