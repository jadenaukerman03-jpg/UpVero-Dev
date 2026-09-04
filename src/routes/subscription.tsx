import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage } from "@/components/upvero/LegalPage";

export const Route = createFileRoute("/subscription")({
  component: () => (
    <LegalPage title="Subscription">
      <p>
        Choose a plan after you save a website draft. Checkout is created server-side for the
        authenticated owner and uses the server’s configured Stripe price mapping.
      </p>
      <Link to="/pricing" className="uv-button uv-button-primary">
        View plans
      </Link>
    </LegalPage>
  ),
});
