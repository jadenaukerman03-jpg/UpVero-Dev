import { Link } from "@tanstack/react-router";
import { Check, Star } from "lucide-react";
import { useState } from "react";

import { formatPlanPrice, type SubscriptionPlan } from "@/data/subscription-plans";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type MarketingPlanCardProps = {
  plan: SubscriptionPlan;
  interactive?: boolean;
  isExpanded?: boolean;
  isCondensed?: boolean;
  onToggle?: () => void;
};

export function MarketingPlanCard({
  plan,
  interactive = false,
  isExpanded = false,
  isCondensed = false,
  onToggle,
}: MarketingPlanCardProps) {
  const [isChoosing, setIsChoosing] = useState(false);

  async function choosePlan() {
    setIsChoosing(true);
    const destination = `/launch?plan=${encodeURIComponent(plan.id)}`;

    try {
      const { data, error } = await createBrowserSupabaseClient().auth.getSession();
      const next =
        !error && data.session ? destination : `/account?next=${encodeURIComponent(destination)}`;
      window.location.assign(next);
    } catch {
      window.location.assign(`/account?next=${encodeURIComponent(destination)}`);
    }
  }

  const className = [
    "uv-plan-card",
    plan.badge ? "uv-plan-card-featured" : "",
    interactive ? "uv-plan-card-interactive" : "",
    isExpanded ? "is-expanded" : "",
    isCondensed ? "is-condensed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className}>
      {plan.badge ? (
        <span className="uv-plan-badge">
          <Star size={13} aria-hidden="true" fill="currentColor" /> Most Popular
        </span>
      ) : null}

      {interactive ? (
        <>
          <button
            type="button"
            className="uv-plan-card-trigger"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={`plan-${plan.id}-details`}
          >
            <span className="uv-plan-title">{plan.name}</span>
            <span className="uv-plan-description">{plan.description}</span>
            <span className="uv-plan-price">
              {formatPlanPrice(plan)}
              <small>/month</small>
            </span>
            <span className="uv-plan-note">
              {isExpanded ? "Select again to close plan details." : "Select to see plan details."}
            </span>
            <span className="uv-plan-feature-summary">
              {plan.features.slice(0, 2).map((feature) => (
                <span key={feature}>
                  <Check size={16} aria-hidden="true" /> {feature}
                </span>
              ))}
            </span>
          </button>

          <div
            id={`plan-${plan.id}-details`}
            className="uv-plan-expanded-details"
            aria-hidden={!isExpanded}
          >
            <div className="uv-plan-expanded-content">
              <div>
                <h3>Everything included</h3>
                <ul className="uv-plan-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check size={16} aria-hidden="true" /> {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Editing access</h3>
                <ul className="uv-plan-features">
                  {plan.editingAccess.map((access) => (
                    <li key={access}>
                      <Check size={16} aria-hidden="true" /> {access}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={
              plan.badge
                ? "uv-button uv-button-primary uv-plan-action uv-plan-go-live"
                : "uv-button uv-button-secondary uv-plan-action uv-plan-go-live"
            }
            onClick={() => void choosePlan()}
            disabled={isChoosing}
          >
            {isChoosing ? "Opening your plan…" : `Go Live with ${plan.name}`}
          </button>
        </>
      ) : (
        <>
          <h3>{plan.name}</h3>
          <p className="uv-plan-description">{plan.description}</p>
          <p className="uv-plan-price">{formatPlanPrice(plan)}</p>
          <p className="uv-plan-note">Secure Stripe checkout after you save your website draft.</p>
          <ul className="uv-plan-features">
            {plan.features.map((feature) => (
              <li key={feature}>
                <Check size={16} aria-hidden="true" /> {feature}
              </li>
            ))}
          </ul>
          <Link
            to="/launch"
            className={
              plan.badge
                ? "uv-button uv-button-primary uv-plan-action"
                : "uv-button uv-button-secondary uv-plan-action"
            }
          >
            Choose {plan.name}
          </Link>
          <Link to="/contact" className="uv-plan-link">
            Or request a free preview first
          </Link>
        </>
      )}
    </article>
  );
}
