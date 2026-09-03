import { createFileRoute } from "@tanstack/react-router";

import { AuthPanel } from "@/components/account/AuthPanel";

export const Route = createFileRoute("/account")({ component: AuthPanel });
