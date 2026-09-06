import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CreateWebsiteDraft } from "@/components/account/CreateWebsiteDraft";

const searchSchema = z.object({ website: z.string().uuid().optional() });

export const Route = createFileRoute("/draft")({
  validateSearch: searchSchema,
  component: DraftRoute,
});

function DraftRoute() {
  const { website } = Route.useSearch();
  return <CreateWebsiteDraft {...(website ? { websiteId: website } : {})} />;
}
