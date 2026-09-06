import { Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { formatPlanPrice, type SubscriptionPlan } from "@/data/subscription-plans";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function MarketingPlanCard({
  plan,
  interactive = false,
}: {
  plan: SubscriptionPlan;
  interactive?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [isOpen]);

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

  return (
    <article
      className={[
        "uv-plan-card",
        plan.badge ? "uv-plan-card-featured" : "",
        interactive ? "uv-plan-card-interactive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {plan.badge ? <span className="uv-plan-badge">{plan.badge}</span> : null}
      {interactive ? (
        <button
          type="button"
          className="uv-plan-card-trigger"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={`View ${plan.name} plan details`}
          ref={triggerRef}
        >
          <span className="uv-plan-title">{plan.name}</span>
          <span className="uv-plan-description">{plan.description}</span>
          <span className="uv-plan-price">
            {formatPlanPrice(plan)}
            <small>/month</small>
          </span>
          <span className="uv-plan-note">Select to review what&apos;s included.</span>
          <span className="uv-plan-feature-summary">
            {plan.features.slice(0, 3).map((feature) => (
              <span key={feature}>
                <Check size={16} aria-hidden="true" /> {feature}
              </span>
            ))}
          </span>
          <span
            className={
              plan.badge
                ? "uv-button uv-button-primary uv-plan-action"
                : "uv-button uv-button-secondary uv-plan-action"
            }
            aria-hidden="true"
          >
            View {plan.name}
          </span>
        </button>
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

      {interactive && isOpen ? (
        <div className="uv-modal-backdrop" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <section
            className="uv-plan-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`plan-${plan.id}-title`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="uv-modal-close"
              onClick={() => setIsOpen(false)}
              aria-label={`Close ${plan.name} plan details`}
              ref={closeButtonRef}
            >
              <X size={20} aria-hidden="true" />
            </button>
            <p className="uv-eyebrow">UpVero {plan.name}</p>
            <h2 id={`plan-${plan.id}-title`}>{plan.name}</h2>
            <p className="uv-plan-modal-price">
              {formatPlanPrice(plan)}
              <small>/month</small>
            </p>
            <p className="uv-plan-description">{plan.description}</p>
            <h3>Included</h3>
            <ul className="uv-plan-features">
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check size={16} aria-hidden="true" /> {feature}
                </li>
              ))}
            </ul>
            <h3>Editing access</h3>
            <ul className="uv-plan-features">
              {plan.editingAccess.map((access) => (
                <li key={access}>
                  <Check size={16} aria-hidden="true" /> {access}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="uv-button uv-button-primary uv-plan-modal-action"
              onClick={() => void choosePlan()}
              disabled={isChoosing}
            >
              {isChoosing ? "Opening your plan…" : `Choose ${plan.name}`}
            </button>
          </section>
        </div>
      ) : null}
    </article>
  );
}
