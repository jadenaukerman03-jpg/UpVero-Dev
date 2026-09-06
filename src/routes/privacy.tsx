import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/upvero/LegalPage";

export const Route = createFileRoute("/privacy")({
  component: () => (
    <LegalPage title="Privacy">
      <p>
        Upvero uses account information to provide private website drafts, secure checkout, and the
        services you request.
      </p>
      <h2>Account data</h2>
      <p>
        Customer data is protected by Supabase authentication and row-level security. Customers can
        access only their own records.
      </p>
      <h2>Payments</h2>
      <p>
        Payment processing is handled through Stripe Checkout. Payment details are not stored in
        this application.
      </p>
    </LegalPage>
  ),
});
