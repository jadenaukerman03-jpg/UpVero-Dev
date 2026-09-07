import { createServerFn } from "@tanstack/react-start";
// This client-callable RPC wrapper has no database or secret imports. The
// implementation is dynamically imported only inside the server handler.
import { publicWebsiteLeadSchema } from "./website-contact-lead-schema";

export const submitWebsiteContactLead = createServerFn({ method: "POST" })
  .validator((data: unknown) => publicWebsiteLeadSchema.parse(data))
  .handler(async ({ data }) => {
    const { persistWebsiteContactLead } = await import("./website-contact-leads.server");
    return persistWebsiteContactLead(data);
  });
