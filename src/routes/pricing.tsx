import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { MarketingLayout } from "@/components/upvero/MarketingLayout";
import { MarketingPlanCard } from "@/components/upvero/MarketingPlanCard";
import { subscriptionPlans } from "@/data/subscription-plans";
import type { SubscriptionTier } from "@/data/customization-tiers";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing — Upvero" }] }),
  component: PricingPage,
});

function PricingPage() {
  const [expandedPlanId, setExpandedPlanId] = useState<SubscriptionTier | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const questions = [
    [
      "Is there a setup fee?",
      "Your plan and price are confirmed securely at checkout. There are no hidden browser-supplied pricing values.",
    ],
    [
      "Do I own my website?",
      "Your content, brand, and domain remain yours. Upvero provides the platform capabilities around them.",
    ],
    [
      "Can I cancel?",
      "Your Stripe-backed subscription status controls paid platform access and can be managed through the supported billing flow.",
    ],
  ] as const;

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
        <div
          className={`uv-plan-grid ${
            expandedPlanId ? `uv-plan-grid-expanded-${expandedPlanId}` : ""
          }`}
        >
          {subscriptionPlans.map((plan) => (
            <MarketingPlanCard
              key={plan.id}
              plan={plan}
              interactive
              isExpanded={expandedPlanId === plan.id}
              isCondensed={Boolean(expandedPlanId && expandedPlanId !== plan.id)}
              onToggle={() => setExpandedPlanId((current) => (current === plan.id ? null : plan.id))}
            />
          ))}
        </div>
      </section>
      <section className="uv-section uv-container uv-faq">
        <h2>Common questions</h2>
        <div>
          {questions.map(([question, answer], index) => {
            const isOpen = openFaq === index;
            return (
              <article key={question} className={`uv-faq-item ${isOpen ? "is-open" : ""}`}>
                <button
                  type="button"
                  onClick={() => setOpenFaq((current) => (current === index ? null : index))}
                  aria-expanded={isOpen}
                  aria-controls={`pricing-faq-${index}`}
                >
                  <span>{question}</span>
                  <ChevronDown className={isOpen ? "uv-chevron-open" : undefined} aria-hidden="true" />
                </button>
                <div id={`pricing-faq-${index}`} className="uv-faq-answer">
                  <p>{answer}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </MarketingLayout>
  );
}
