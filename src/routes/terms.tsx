import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/upvero/LegalPage";

export const Route = createFileRoute("/terms")({
  component: () => (
    <LegalPage title="Terms">
      <p>
        Upvero provides website creation and related platform services under the plan selected
        through secure checkout.
      </p>
      <h2>Website content</h2>
      <p>
        You are responsible for ensuring the business information, brand material, and claims you
        provide are accurate and authorized.
      </p>
      <h2>Subscriptions</h2>
      <p>
        Paid platform access is controlled by the trusted subscription record maintained from Stripe
        webhook events.
      </p>
    </LegalPage>
  ),
});
