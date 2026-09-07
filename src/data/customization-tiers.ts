export const subscriptionTiers = ["launch", "growth", "professional"] as const;
export type SubscriptionTier = (typeof subscriptionTiers)[number];

export const tierDefinitions: Record<
  SubscriptionTier,
  { label: string; description: string; rank: number }
> = {
  launch: {
    label: "Launch",
    description: "Essential choices for a polished first site.",
    rank: 1,
  },
  growth: {
    label: "Growth",
    description: "More visual, color, and layout flexibility.",
    rank: 2,
  },
  professional: {
    label: "Professional",
    description: "Full customization within UpVero capabilities.",
    rank: 3,
  },
};

export type CustomizationControl = "font" | "visual-direction" | "color-theme";

export type CustomizationOptionDefinition = {
  control: CustomizationControl;
  id: string;
  minimumTier: SubscriptionTier;
};

/** Single source of truth for editor feature access. Add future options here. */
export const customizationOptions: CustomizationOptionDefinition[] = [
  { control: "visual-direction", id: "professional", minimumTier: "launch" },
  { control: "visual-direction", id: "friendly", minimumTier: "launch" },
  { control: "visual-direction", id: "modern", minimumTier: "growth" },
  { control: "visual-direction", id: "minimal", minimumTier: "growth" },
  { control: "visual-direction", id: "luxury", minimumTier: "professional" },
  { control: "color-theme", id: "original", minimumTier: "launch" },
  { control: "color-theme", id: "blue", minimumTier: "launch" },
  { control: "color-theme", id: "green", minimumTier: "growth" },
  { control: "color-theme", id: "dark", minimumTier: "growth" },
  { control: "color-theme", id: "red", minimumTier: "growth" },
  { control: "color-theme", id: "warm", minimumTier: "growth" },
  { control: "color-theme", id: "premium", minimumTier: "professional" },
  { control: "font", id: "original", minimumTier: "launch" },
  { control: "font", id: "clean", minimumTier: "launch" },
  { control: "font", id: "modern", minimumTier: "growth" },
  { control: "font", id: "corporate", minimumTier: "growth" },
  { control: "font", id: "editorial", minimumTier: "professional" },
  { control: "font", id: "industrial", minimumTier: "professional" },
  { control: "font", id: "classic", minimumTier: "professional" },
];

export type FontOption = {
  id: string;
  label: string;
  description: string;
  variables: Record<"--preview-font-sans" | "--preview-font-display", string>;
};

/** Curated type systems only: each pair is chosen for a professional local-business site. */
export const fontOptions: FontOption[] = [
  {
    id: "original",
    label: "Recommended",
    description: "Fraunces headings with Archivo body copy",
    variables: {
      "--preview-font-display": '"Fraunces", ui-serif, Georgia, serif',
      "--preview-font-sans": '"Archivo", ui-sans-serif, system-ui, sans-serif',
    },
  },
  {
    id: "clean",
    label: "Modern / Clean",
    description: "Manrope headings with DM Sans body copy",
    variables: {
      "--preview-font-display": '"Manrope", ui-sans-serif, system-ui, sans-serif',
      "--preview-font-sans": '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    },
  },
  {
    id: "modern",
    label: "Bold / Modern",
    description: "Space Grotesk with DM Sans",
    variables: {
      "--preview-font-display": '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
      "--preview-font-sans": '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    },
  },
  {
    id: "corporate",
    label: "Professional / Corporate",
    description: "Libre Baskerville with Source Sans 3",
    variables: {
      "--preview-font-display": '"Libre Baskerville", ui-serif, Georgia, serif',
      "--preview-font-sans": '"Source Sans 3", ui-sans-serif, system-ui, sans-serif',
    },
  },
  {
    id: "editorial",
    label: "Luxury / Editorial",
    description: "Cormorant Garamond with DM Sans",
    variables: {
      "--preview-font-display": '"Cormorant Garamond", ui-serif, Georgia, serif',
      "--preview-font-sans": '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    },
  },
  {
    id: "industrial",
    label: "Bold / Industrial",
    description: "Space Grotesk with IBM Plex Sans",
    variables: {
      "--preview-font-display": '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
      "--preview-font-sans": '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    },
  },
  {
    id: "classic",
    label: "Classic / Traditional",
    description: "Merriweather with Source Sans 3",
    variables: {
      "--preview-font-display": '"Merriweather", ui-serif, Georgia, serif',
      "--preview-font-sans": '"Source Sans 3", ui-sans-serif, system-ui, sans-serif',
    },
  },
];

export function optionMinimumTier(control: CustomizationControl, id: string): SubscriptionTier {
  return (
    customizationOptions.find((option) => option.control === control && option.id === id)
      ?.minimumTier ?? "professional"
  );
}

export function isOptionUnlocked(
  tier: SubscriptionTier,
  control: CustomizationControl,
  optionId: string,
): boolean {
  return tierDefinitions[tier].rank >= tierDefinitions[optionMinimumTier(control, optionId)].rank;
}
