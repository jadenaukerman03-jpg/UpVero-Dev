import { createFileRoute } from "@tanstack/react-router";

import { CustomerDashboard } from "@/components/account/CustomerDashboard";

export const Route = createFileRoute("/dashboard")({ component: CustomerDashboard });
