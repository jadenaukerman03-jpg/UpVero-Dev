import { createFileRoute } from "@tanstack/react-router";

import { PlanSelection } from "@/components/site/PlanSelection";

export const Route = createFileRoute("/launch")({ component: LaunchWebsite });

function LaunchWebsite() {
  return <PlanSelection />;
}
