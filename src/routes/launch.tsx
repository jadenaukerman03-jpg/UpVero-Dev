import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { PlanSelection } from "@/components/site/PlanSelection";
import { subscriptionTiers } from "@/data/customization-tiers";

export const Route = createFileRoute("/launch")({
  validateSearch: z.object({ plan: z.enum(subscriptionTiers).optional() }),
  component: LaunchWebsite,
});

function LaunchWebsite() {
  const { plan } = Route.useSearch();
  return plan ? <PlanSelection initialPlanId={plan} /> : <PlanSelection />;
}
