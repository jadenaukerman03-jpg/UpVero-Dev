import type { SiteConfig } from "./site";

export type DemoTheme = {
  id: string;
  label: string;
  recommended?: boolean;
  swatches: [string, string, string];
  variables?: Record<"--bone" | "--sand" | "--ink" | "--clay" | "--clay-dark", string>;
};

export const visualDirections = [
  "professional",
  "modern",
  "luxury",
  "friendly",
  "minimal",
] as const;
export type DemoVisualDirection = (typeof visualDirections)[number];

export type VisualDirectionDefinition = {
  id: DemoVisualDirection;
  label: string;
  description: string;
  variables: Record<
    "--demo-radius" | "--demo-shadow" | "--demo-section-space" | "--font-display",
    string
  >;
};

export const visualDirectionDefinitions: Record<DemoVisualDirection, VisualDirectionDefinition> = {
  professional: {
    id: "professional",
    label: "Professional",
    description: "Balanced and established",
    variables: {
      "--demo-radius": "1rem",
      "--demo-shadow": "0 10px 25px rgb(18 26 38 / 8%)",
      "--demo-section-space": "1",
      "--font-display": '"Fraunces", ui-serif, Georgia, serif',
    },
  },
  modern: {
    id: "modern",
    label: "Modern",
    description: "Contemporary and bold",
    variables: {
      "--demo-radius": "0.75rem",
      "--demo-shadow": "0 16px 40px rgb(18 26 38 / 14%)",
      "--demo-section-space": "1.08",
      "--font-display": '"Archivo", ui-sans-serif, system-ui, sans-serif',
    },
  },
  luxury: {
    id: "luxury",
    label: "Luxury",
    description: "Refined and elevated",
    variables: {
      "--demo-radius": "1.5rem",
      "--demo-shadow": "0 18px 50px rgb(18 18 15 / 12%)",
      "--demo-section-space": "1.18",
      "--font-display": '"Fraunces", ui-serif, Georgia, serif',
    },
  },
  friendly: {
    id: "friendly",
    label: "Friendly",
    description: "Warm and welcoming",
    variables: {
      "--demo-radius": "1.35rem",
      "--demo-shadow": "0 12px 30px rgb(18 38 28 / 10%)",
      "--demo-section-space": "1.05",
      "--font-display": '"Archivo", ui-sans-serif, system-ui, sans-serif',
    },
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    description: "Simple and focused",
    variables: {
      "--demo-radius": "0.5rem",
      "--demo-shadow": "0 4px 14px rgb(18 26 38 / 5%)",
      "--demo-section-space": "0.9",
      "--font-display": '"Archivo", ui-sans-serif, system-ui, sans-serif',
    },
  },
};

export function getRecommendedVisualDirection(config: SiteConfig): DemoVisualDirection {
  const context = [
    config.brand.name,
    config.about.body,
    ...config.services.items.map((service) => service.title),
  ]
    .join(" ")
    .toLowerCase();
  if (
    /(auto|automotive|mechanic|repair shop|vehicle|architecture|architect|interior design)/.test(
      context,
    )
  )
    return "modern";
  if (/(restaurant|cafe|bakery|catering|dining|food|landscap|garden)/.test(context))
    return "friendly";
  if (/(law|legal|attorney|financial|accounting|consulting)/.test(context)) return "professional";
  if (/(luxury|premium|estate|boutique|high-end)/.test(context)) return "luxury";
  return "professional";
}

const originalTheme: DemoTheme = {
  id: "original",
  label: "Recommended",
  recommended: true,
  swatches: ["#fdfbf6", "#354050", "#b86735"],
};

const genericThemes: DemoTheme[] = [
  {
    id: "blue",
    label: "Professional Blue",
    swatches: ["#f7fbff", "#142f4b", "#2474b6"],
    variables: {
      "--bone": "oklch(0.985 0.003 245)",
      "--sand": "oklch(0.93 0.018 245)",
      "--ink": "oklch(0.27 0.045 250)",
      "--clay": "oklch(0.56 0.14 245)",
      "--clay-dark": "oklch(0.46 0.13 245)",
    },
  },
  {
    id: "green",
    label: "Clean Green",
    swatches: ["#f8fcf7", "#203c32", "#478b61"],
    variables: {
      "--bone": "oklch(0.985 0.006 145)",
      "--sand": "oklch(0.93 0.02 145)",
      "--ink": "oklch(0.27 0.035 150)",
      "--clay": "oklch(0.56 0.11 150)",
      "--clay-dark": "oklch(0.46 0.1 150)",
    },
  },
  {
    id: "dark",
    label: "Modern Dark",
    swatches: ["#f8f8f7", "#22252b", "#67727c"],
    variables: {
      "--bone": "oklch(0.985 0.002 95)",
      "--sand": "oklch(0.91 0.005 255)",
      "--ink": "oklch(0.24 0.014 260)",
      "--clay": "oklch(0.49 0.025 250)",
      "--clay-dark": "oklch(0.39 0.02 250)",
    },
  },
  {
    id: "premium",
    label: "Premium",
    swatches: ["#fcfaf3", "#20201e", "#a98535"],
    variables: {
      "--bone": "oklch(0.985 0.007 95)",
      "--sand": "oklch(0.92 0.02 90)",
      "--ink": "oklch(0.25 0.008 90)",
      "--clay": "oklch(0.61 0.105 85)",
      "--clay-dark": "oklch(0.5 0.09 85)",
    },
  },
];

const automotiveThemes: DemoTheme[] = [
  {
    id: "red",
    label: "Performance Red",
    swatches: ["#fbf8f6", "#232629", "#b9423d"],
    variables: {
      "--bone": "oklch(0.985 0.003 50)",
      "--sand": "oklch(0.925 0.012 35)",
      "--ink": "oklch(0.25 0.01 255)",
      "--clay": "oklch(0.56 0.18 28)",
      "--clay-dark": "oklch(0.46 0.16 28)",
    },
  },
  genericThemes[0]!,
  genericThemes[2]!,
  genericThemes[3]!,
];

const hospitalityThemes: DemoTheme[] = [
  {
    id: "warm",
    label: "Warm Welcome",
    swatches: ["#fff9f1", "#3e2e27", "#bd6b3b"],
    variables: {
      "--bone": "oklch(0.985 0.012 75)",
      "--sand": "oklch(0.93 0.025 75)",
      "--ink": "oklch(0.28 0.03 55)",
      "--clay": "oklch(0.6 0.13 48)",
      "--clay-dark": "oklch(0.5 0.12 48)",
    },
  },
  genericThemes[3]!,
  genericThemes[2]!,
  genericThemes[1]!,
];

/** Curated palettes are selected from the generated site's own business content. */
export function getDemoThemes(config: SiteConfig): DemoTheme[] {
  const businessContext = [
    config.brand.name,
    config.about.body,
    ...config.services.items.map((service) => service.title),
  ]
    .join(" ")
    .toLowerCase();
  if (/(auto|automotive|mechanic|repair shop|vehicle)/.test(businessContext))
    return [originalTheme, ...automotiveThemes];
  if (/(restaurant|cafe|bakery|catering|dining|food)/.test(businessContext))
    return [originalTheme, ...hospitalityThemes];
  return [originalTheme, ...genericThemes];
}
