import { tierDefinitions, type SubscriptionTier } from "./customization-tiers";

export type SubscriptionPlan = {
  id: SubscriptionTier;
  name: string;
  badge?: string;
  description: string;
  /** Public pricing is deliberately centralized here; configure amounts before enabling checkout. */
  monthlyPriceCents: number | null;
  setupFeeCents: number | null;
  stripePriceEnvironmentVariable: string;
  features: string[];
  editingAccess: string[];
};

/**
 * Central product catalog. Stripe Price IDs belong in server-side environment
 * variables named by `stripePriceEnvironmentVariable`, never in browser code.
 */
export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "launch",
    name: "Launch",
    description: "A polished, focused website with essential controls.",
    monthlyPriceCents: 9900,
    setupFeeCents: null,
    stripePriceEnvironmentVariable: "STRIPE_PRICE_LAUNCH",
    features: [
      "A generated website and secure preview URL",
      "Essential fonts, colors, and visual directions",
      "Basic business-information editing",
      "Custom-domain connection guidance",
    ],
    editingAccess: ["Limited fonts", "Essential visual directions", "Basic content editing"],
  },
  {
    id: "growth",
    name: "Growth",
    badge: "Most popular",
    description: "The best balance of control, flexibility, and simplicity.",
    monthlyPriceCents: 19900,
    setupFeeCents: null,
    stripePriceEnvironmentVariable: "STRIPE_PRICE_GROWTH",
    features: [
      "Everything in Launch",
      "Expanded fonts, colors, and visual directions",
      "Advanced editing and section-level controls",
      "Priority access to new UpVero capabilities",
    ],
    editingAccess: ["Expanded fonts", "More visual directions", "Advanced editing"],
  },
  {
    id: "professional",
    name: "Professional",
    description: "Full customization within UpVero platform capabilities.",
    monthlyPriceCents: 39900,
    setupFeeCents: null,
    stripePriceEnvironmentVariable: "STRIPE_PRICE_PROFESSIONAL",
    features: [
      "Everything in Growth",
      "All supported fonts, directions, and design controls",
      "Maximum supported section and component flexibility",
      "Full UpVero customization access",
    ],
    editingAccess: ["All supported fonts", "All visual directions", "Maximum supported editing"],
  },
];

export function getSubscriptionPlan(id: SubscriptionTier): SubscriptionPlan {
  const plan = subscriptionPlans.find((candidate) => candidate.id === id);
  if (!plan) throw new Error(`Unknown subscription plan: ${id}`);
  return plan;
}

export function formatPlanPrice(plan: SubscriptionPlan): string {
  if (plan.monthlyPriceCents === null) return "Pricing configured at checkout";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(plan.monthlyPriceCents / 100);
}

export function planTierSummary(plan: SubscriptionPlan): string {
  return tierDefinitions[plan.id].description;
}
