import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { formatPlanPrice, type SubscriptionPlan } from "@/data/subscription-plans";

export function MarketingPlanCard({ plan }: { plan: SubscriptionPlan }) {
  return (
    <article className={plan.badge ? "uv-plan-card uv-plan-card-featured" : "uv-plan-card"}>
      {plan.badge ? <span className="uv-plan-badge">{plan.badge}</span> : null}
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
    </article>
  );
}
