import { Check, Lock, Sparkles } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import {
  formatPlanPrice,
  planTierSummary,
  subscriptionPlans,
  type SubscriptionPlan,
} from "@/data/subscription-plans";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { savePurchaseDraft } from "@/services/customer-data";

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: SubscriptionPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex h-full w-full flex-col rounded-2xl border p-6 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${selected ? "border-clay bg-sand/55 shadow-lg shadow-ink/8" : "border-ink/10 bg-bone hover:border-ink/25 hover:bg-sand/35"}`}
      aria-pressed={selected}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-clay px-3 py-1 text-xs font-bold tracking-wide text-bone uppercase">
          <Sparkles className="mr-1 inline-block size-3" aria-hidden="true" />
          {plan.badge}
        </span>
      )}
      <p className="font-display text-2xl font-medium text-ink">{plan.name}</p>
      <p className="mt-2 min-h-12 text-sm leading-relaxed text-ink/65">{plan.description}</p>
      <p className="mt-6 font-display text-xl font-medium text-ink">{formatPlanPrice(plan)}</p>
      <p className="mt-1 text-xs text-ink/50">{planTierSummary(plan)}</p>
      <ul className="mt-6 space-y-3 border-t border-ink/10 pt-5 text-sm text-ink/75">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-clay" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <span
        className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${selected ? "bg-ink text-bone" : "border border-ink/15 text-ink"}`}
      >
        {selected ? "Selected" : `Choose ${plan.name}`}
      </span>
    </button>
  );
}

export function PlanSelection() {
  const [selectedPlanId, setSelectedPlanId] = useState("growth");
  const [notice, setNotice] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const persistPurchaseDraft = useServerFn(savePurchaseDraft);
  const selectedPlan = subscriptionPlans.find((plan) => plan.id === selectedPlanId) ?? subscriptionPlans[1]!;

  async function continueToCheckout() {
    const { data, error } = await createBrowserSupabaseClient().auth.getSession();
    if (error || !data.session) {
      setNotice("Sign in at /account to save your plan choice before checkout.");
      return;
    }
    try {
      setIsSavingDraft(true);
      await persistPurchaseDraft({
        data: { accessToken: data.session.access_token, tier: selectedPlan.id },
      });
      setNotice(
        "Your plan choice is saved securely. Stripe checkout is the next implementation phase.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save your plan choice.");
    } finally {
      setIsSavingDraft(false);
    }
  }

  return (
    <main className="min-h-screen bg-sand/40 px-6 py-12 text-ink sm:px-10 sm:py-18">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold tracking-wide text-clay">UpVero</p>
        <h1 className="mt-2 max-w-2xl font-display text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
          Choose the plan that fits your website.
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink/65">
          Your site remains a private preview until payment is securely confirmed and ownership is assigned.
        </p>

        <div className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {subscriptionPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={plan.id === selectedPlanId}
              onSelect={() => {
                setSelectedPlanId(plan.id);
                setNotice("");
              }}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink p-5 text-bone sm:flex-row sm:items-center sm:p-6">
          <div>
            <p className="font-display text-xl font-medium">{selectedPlan.name}</p>
            <p className="mt-1 text-sm text-bone/70">{formatPlanPrice(selectedPlan)} · Cancel or change plans through the future billing portal.</p>
          </div>
          <button
            type="button"
            onClick={continueToCheckout}
            disabled={isSavingDraft}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-clay px-5 py-3 text-sm font-semibold text-bone transition hover:bg-clay-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingDraft ? "Saving plan…" : "Continue to secure checkout"}
          </button>
        </div>
        {notice && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-clay/30 bg-bone px-4 py-3 text-sm text-ink/75" role="status">
            <Lock className="mt-0.5 size-4 shrink-0 text-clay" aria-hidden="true" />
            {notice}
          </p>
        )}
      </section>
    </main>
  );
}
