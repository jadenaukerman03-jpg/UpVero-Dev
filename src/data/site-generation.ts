export const generationQualityModes = ["efficient", "studio", "signature"] as const;

export type GenerationQualityMode = (typeof generationQualityModes)[number];

export const generationQualityDefinitions: Record<
  GenerationQualityMode,
  {
    label: string;
    description: string;
    estimatedCostLabel: string;
  }
> = {
  efficient: {
    label: "Efficient",
    description: "Fast, business-specific copy for large approved batches.",
    estimatedCostLabel: "Usually 1–4¢ per website",
  },
  studio: {
    label: "Studio",
    description: "Planning, original copy, and an independent quality review.",
    estimatedCostLabel: "Usually 4–12¢ per website",
  },
  signature: {
    label: "Signature",
    description: "Highest-reasoning models, deeper art direction, and final repair.",
    estimatedCostLabel: "Usually 15–50¢ per website",
  },
};
