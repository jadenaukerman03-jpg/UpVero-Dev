import { createServerFn } from "@tanstack/react-start";

import { supportContactMessageSchema } from "./support-contact-message-schema";

// Browser-safe RPC facade. The persistence implementation is dynamically
// imported only from the server handler and cannot enter the client bundle.
export const submitSupportContactMessage = createServerFn({ method: "POST" })
  .validator((data: unknown) => supportContactMessageSchema.parse(data))
  .handler(async ({ data }) => {
    const { persistSupportContactMessage } = await import("./support-contact-messages.server");
    return persistSupportContactMessage(data);
  });
