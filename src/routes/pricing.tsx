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
              onToggle={() =>
                setExpandedPlanId((current) => (current === plan.id ? null : plan.id))
              }
            />
          ))}
        </div>
      </section>
      <section className="uv-modern-faq-section">
        <div className="uv-container uv-faq uv-home-faq uv-modern-faq">
          <div className="uv-modern-faq-intro">
            <p className="uv-eyebrow">Good questions</p>
            <h2>Everything you need to know before you choose a plan.</h2>
            <p>Clear answers, no pressure, and a private preview before payment.</p>
          </div>
          <div>
            {questions.map(([question, answer], index) => {
              const isOpen = openFaq === index;
              return (
                <article key={question} className={isOpen ? "uv-faq-item is-open" : "uv-faq-item"}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq((current) => (current === index ? null : index))}
                    aria-expanded={isOpen}
                    aria-controls={`pricing-faq-${index}`}
                  >
                    {question}
                    <ChevronDown
                      size={18}
                      className={isOpen ? "uv-chevron-open" : ""}
                      aria-hidden="true"
                    />
                  </button>
                  <div id={`pricing-faq-${index}`} className="uv-faq-answer" aria-hidden={!isOpen}>
                    <p>{answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
