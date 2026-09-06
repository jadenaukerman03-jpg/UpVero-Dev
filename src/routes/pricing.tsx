import { createFileRoute } from "@tanstack/react-router";

import { MarketingLayout } from "@/components/upvero/MarketingLayout";
import { MarketingPlanCard } from "@/components/upvero/MarketingPlanCard";
import { subscriptionPlans } from "@/data/subscription-plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing — Upvero" }] }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <MarketingLayout>
      <section className="uv-page-hero">
        <div className="uv-grid-backdrop" aria-hidden="true" />
        <div className="uv-container">
          <h1>
            One straightforward plan. <span>Everything included.</span>
          </h1>
          <p>
            Pick the level of website access your business needs today and move up whenever you are
            ready.
          </p>
        </div>
      </section>
      <section className="uv-section uv-container">
        <div className="uv-plan-grid">
          {subscriptionPlans.map((plan) => (
            <MarketingPlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>
      <section className="uv-section uv-container uv-faq">
        <h2>Common questions</h2>
        <div>
          <article>
            <h3>Is there a setup fee?</h3>
            <p>
              Your plan and price are confirmed securely at checkout. There are no hidden
              browser-supplied pricing values.
            </p>
          </article>
          <article>
            <h3>Do I own my website?</h3>
            <p>
              Your content, brand, and domain remain yours. Upvero provides the platform
              capabilities around them.
            </p>
          </article>
          <article>
            <h3>Can I cancel?</h3>
            <p>
              Your Stripe-backed subscription status controls paid platform access and can be
              managed through the supported billing flow.
            </p>
          </article>
        </div>
      </section>
    </MarketingLayout>
  );
}
