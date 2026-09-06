import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Gauge,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import { MarketingLayout } from "@/components/upvero/MarketingLayout";
import { MarketingPlanCard } from "@/components/upvero/MarketingPlanCard";
import { subscriptionPlans } from "@/data/subscription-plans";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Upvero — Websites built, hosted, and maintained for local businesses" },
      {
        name: "description",
        content:
          "Upvero builds professional websites for local service businesses, then hosts, secures, and maintains them for one straightforward monthly plan.",
      },
    ],
  }),
  component: Index,
});

const steps = [
  [
    "We learn your business",
    "Tell us what you do, where you work, and what matters to your customers.",
  ],
  [
    "We build a private preview",
    "We create a mobile-first website draft using accurate business details.",
  ],
  ["You look it over", "Review your private preview and request changes before you ever pay."],
  [
    "We launch and maintain it",
    "Hosting, security, updates, and normal edits stay handled for you.",
  ],
] as const;

const faqs = [
  [
    "Do I really get a free preview?",
    "Yes. You can review a personalized preview before purchasing a plan.",
  ],
  [
    "What is included in the monthly plan?",
    "Hosting, SSL, security updates, backups, and normal content edits are included.",
  ],
  [
    "Can I keep my domain?",
    "Yes. Your domain and content remain yours; we help connect them when your site launches.",
  ],
  [
    "Will the site work on phones?",
    "Yes. Every website is designed to be fast and useful on phones, tablets, and desktops.",
  ],
] as const;

const valueProps: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Gauge,
    title: "Live today",
    body: "Your preview is ready before the first conversation. Once approved, your site can be ready to launch quickly.",
  },
  {
    icon: Wrench,
    title: "Nothing to manage",
    body: "Hosting, security, updates, and content edits are handled without another dashboard to learn.",
  },
  {
    icon: ShieldCheck,
    title: "Honest by default",
    body: "We use accurate information and do not invent reviews, awards, or credentials.",
  },
];

function Index() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <MarketingLayout>
      <section className="uv-hero">
        <div className="uv-grid-backdrop" aria-hidden="true" />
        <div className="uv-container uv-hero-content">
          <p className="uv-pill">
            <Sparkles size={14} /> Free personalized preview before you pay a cent
          </p>
          <h1>
            Your business deserves a website that actually <span>brings in work</span>.
          </h1>
          <p className="uv-lead">
            Upvero builds professional websites for local businesses — then hosts, secures, and
            maintains them for one straightforward monthly plan. No technical homework.
          </p>
          <div className="uv-cta-row">
            <Link to="/contact" className="uv-button uv-button-primary">
              Get my free preview <ArrowRight size={16} />
            </Link>
            <Link to="/pricing" className="uv-button uv-button-secondary">
              See pricing
            </Link>
          </div>
          <div className="uv-trust-row">
            {[
              "Free preview before payment",
              "No long-term contracts",
              "Hosting and updates included",
            ].map((item) => (
              <span key={item}>
                <Check size={16} /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="uv-band">
        <div className="uv-container uv-value-grid">
          {valueProps.map(({ icon: FeatureIcon, title, body }) => (
            <article key={title} className="uv-value-card">
              <FeatureIcon size={21} />
              <h2>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="uv-section uv-container">
        <h2>How it works</h2>
        <p className="uv-section-intro">
          Four simple steps from first contact to a site that is live, secure, and looked after.
        </p>
        <ol className="uv-steps">
          {steps.map(([title, body], index) => (
            <li key={title}>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="uv-band">
        <div className="uv-container uv-process">
          <div>
            <CalendarDays size={30} />
            <h2>What happens after you sign up</h2>
            <p>Clear milestones, a private website draft, and a secure path to launch.</p>
          </div>
          <ol>
            {[
              "Choose a plan",
              "Save your website draft",
              "Complete secure checkout",
              "Launch when ready",
            ].map((item, index) => (
              <li key={item}>
                <span>{index + 1}</span>
                <div>
                  <h3>{item}</h3>
                  <p>Each step stays connected to your authenticated Upvero account.</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="uv-section uv-container">
        <h2>Built for local trades and services</h2>
        <p className="uv-section-intro">
          The content, layout, and calls-to-action are tuned for customers ready to call, book, or
          visit.
        </p>
        <div className="uv-chip-row">
          {[
            "Cleaning",
            "Landscaping",
            "Pressure washing",
            "Contractors",
            "Roofing",
            "Auto detailing",
            "Restaurants",
            "Barbershops",
            "Salons",
            "Moving companies",
          ].map((industry) => (
            <span key={industry}>{industry}</span>
          ))}
        </div>
      </section>

      <section className="uv-section uv-container">
        <div className="uv-section-heading">
          <div>
            <h2>Simple monthly pricing</h2>
            <p>
              One plan covers the build, hosting, and upkeep. No surprise charges for SSL,
              bandwidth, backups, or normal edits.
            </p>
          </div>
          <Link to="/pricing" className="uv-text-link">
            Compare plans <ArrowRight size={16} />
          </Link>
        </div>
        <div className="uv-plan-grid">
          {subscriptionPlans.map((plan) => (
            <MarketingPlanCard key={plan.id} plan={plan} interactive />
          ))}
        </div>
      </section>

      <section className="uv-band">
        <div className="uv-container uv-faq uv-home-faq">
          <h2>Questions we hear a lot</h2>
          <p>Straight answers about previews, pricing, ownership, and launch.</p>
          <div>
            {faqs.map(([question, answer], index) => {
              const isOpen = openFaq === index;
              return (
                <article key={question} className={isOpen ? "uv-faq-item is-open" : "uv-faq-item"}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    {question}
                    <ChevronDown size={18} className={isOpen ? "uv-chevron-open" : ""} />
                  </button>
                  <div className="uv-faq-answer" aria-hidden={!isOpen}>
                    <p>{answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="uv-section uv-container">
        <Link to="/draft" className="uv-final-cta uv-clickable-card">
          <h2>See your website before you decide.</h2>
          <p>
            Tell us about your business and we’ll build a personalized preview. No obligation and no
            card required.
          </p>
          <span className="uv-button uv-button-primary">Request my preview</span>
        </Link>
      </section>
    </MarketingLayout>
  );
}
