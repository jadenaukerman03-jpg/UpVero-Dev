import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Globe2,
  LayoutTemplate,
  MessageCircle,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useState } from "react";

import { MarketingLayout } from "@/components/upvero/MarketingLayout";
import { MarketingPlanCard } from "@/components/upvero/MarketingPlanCard";
import type { SubscriptionTier } from "@/data/customization-tiers";
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

const businessTypes = [
  "Cleaning",
  "Landscaping",
  "Pressure washing",
  "Contractors",
  "Roofing",
  "Auto detailing",
  "Restaurants",
  "Barbershops",
] as const;

function Index() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [expandedPlanId, setExpandedPlanId] = useState<SubscriptionTier | null>(null);

  return (
    <MarketingLayout>
      <section className="uv-modern-hero">
        <div className="uv-modern-hero-grid" aria-hidden="true" />
        <div className="uv-container uv-modern-hero-content">
          <div className="uv-modern-hero-copy">
            <p className="uv-modern-kicker">
              <Sparkles size={15} aria-hidden="true" /> Websites for local businesses
            </p>
            <h1>
              Turn your <span>best work</span> into more of it.
            </h1>
            <p className="uv-modern-lead">
              A professional website, a clear path to launch, and none of the technical work left on
              your plate.
            </p>
            <div className="uv-modern-hero-actions">
              <Link to="/contact" className="uv-button uv-button-primary">
                Request my free preview <ArrowUpRight size={17} />
              </Link>
              <Link to="/pricing" className="uv-modern-text-action">
                Explore plans <ArrowRight size={16} />
              </Link>
            </div>
            <div className="uv-modern-reassurance" aria-label="Upvero commitments">
              <span>
                <Check size={15} aria-hidden="true" /> Preview before payment
              </span>
              <span>
                <Check size={15} aria-hidden="true" /> Hosting included
              </span>
              <span>
                <Check size={15} aria-hidden="true" /> Built for every screen
              </span>
            </div>
          </div>

          <div className="uv-modern-preview" aria-label="Example Upvero website preview">
            <div className="uv-modern-preview-bar">
              <span className="uv-modern-preview-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>yourbusiness.com</span>
              <ShieldCheck size={15} aria-label="Secure" />
            </div>
            <div className="uv-modern-preview-site">
              <div className="uv-modern-preview-nav">
                <strong>YOUR BUSINESS</strong>
                <span aria-hidden="true">Menu</span>
              </div>
              <div className="uv-modern-preview-headline">
                <p>Built to make a strong first impression.</p>
                <h2>Make it easy to choose you.</h2>
                <span>Get started</span>
              </div>
              <div className="uv-modern-preview-tiles">
                <span>
                  <Globe2 size={18} aria-hidden="true" /> Ready everywhere
                </span>
                <span>
                  <MessageCircle size={18} aria-hidden="true" /> Easy to contact
                </span>
              </div>
            </div>
            <div className="uv-modern-preview-note">
              <span className="uv-modern-live-dot" aria-hidden="true" /> Your preview starts
              private.
            </div>
          </div>
        </div>
      </section>

      <section className="uv-modern-strip">
        <div className="uv-container uv-modern-strip-content">
          <p>One clear system for a better online first impression.</p>
          <div>
            <span>Build</span>
            <i aria-hidden="true" />
            <span>Review</span>
            <i aria-hidden="true" />
            <span>Launch</span>
            <i aria-hidden="true" />
            <span>Maintain</span>
          </div>
        </div>
      </section>

      <section className="uv-modern-section uv-container">
        <div className="uv-modern-section-heading">
          <p className="uv-eyebrow">Why Upvero</p>
          <h2>Everything customers need to feel confident calling you.</h2>
          <p>
            Clear information, a polished presentation, and a site that stays useful after launch.
          </p>
        </div>
        <div className="uv-modern-bento">
          <article className="uv-modern-bento-primary">
            <div className="uv-modern-bento-icon">
              <LayoutTemplate size={23} aria-hidden="true" />
            </div>
            <p className="uv-eyebrow">Designed to convert</p>
            <h3>Built around the moment someone decides to reach out.</h3>
            <p>
              The layout, content, and calls-to-action help visitors understand what you do and how
              to get started.
            </p>
          </article>
          <article>
            <div className="uv-modern-bento-icon">
              <MousePointer2 size={21} aria-hidden="true" />
            </div>
            <h3>Review first</h3>
            <p>See a private preview before you choose a plan or enter payment details.</p>
          </article>
          <article>
            <div className="uv-modern-bento-icon">
              <Wrench size={21} aria-hidden="true" />
            </div>
            <h3>Stay focused</h3>
            <p>Hosting, updates, security, and normal edits stay handled in one place.</p>
          </article>
        </div>
      </section>

      <section className="uv-modern-process-section">
        <div className="uv-container">
          <div className="uv-modern-process-heading">
            <div>
              <p className="uv-eyebrow">A simpler way to launch</p>
              <h2>From idea to online in four clear moves.</h2>
            </div>
            <Link to="/contact" className="uv-modern-text-action">
              Request your preview <ArrowRight size={16} />
            </Link>
          </div>
          <ol className="uv-modern-process">
            {[
              ["01", "Tell us the essentials", "Share your business, location, and services."],
              ["02", "Review your preview", "Look over a private website draft before deciding."],
              ["03", "Choose your plan", "Pick the level of access that fits your business."],
              [
                "04",
                "Go live with confidence",
                "Launch when you are ready, with ongoing care included.",
              ],
            ].map(([number, title, body]) => (
              <li key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="uv-modern-section uv-container uv-modern-fit-section">
        <div className="uv-modern-fit-copy">
          <p className="uv-eyebrow">Made for local work</p>
          <h2>Your business is personal. Your website should feel that way too.</h2>
          <p>
            Upvero gives local service businesses a focused, professional online presence without
            turning website management into another job.
          </p>
          <Link to="/contact" className="uv-button uv-button-secondary">
            Request your website preview <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="uv-modern-industry-cloud" aria-label="Businesses Upvero supports">
          {businessTypes.map((industry) => (
            <span key={industry}>{industry}</span>
          ))}
        </div>
      </section>

      <section className="uv-modern-pricing uv-container">
        <div className="uv-modern-pricing-heading">
          <div>
            <p className="uv-eyebrow">Straightforward pricing</p>
            <h2>Choose the control you need. Keep the help you want.</h2>
          </div>
          <p>Every plan begins with a private website preview and a secure path to launch.</p>
        </div>
        <div
          className={
            expandedPlanId
              ? `uv-plan-grid uv-plan-grid-is-expanded uv-plan-grid-expanded-${expandedPlanId}`
              : "uv-plan-grid"
          }
        >
          {subscriptionPlans.map((plan) => (
            <MarketingPlanCard
              key={plan.id}
              plan={plan}
              interactive
              isExpanded={expandedPlanId === plan.id}
              isCondensed={expandedPlanId !== null && expandedPlanId !== plan.id}
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
            <h2>Everything you need to know before you begin.</h2>
            <p>Clear answers, no pressure, and a preview before payment.</p>
          </div>
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

      <section className="uv-modern-final-section uv-container">
        <Link to="/contact" className="uv-modern-final-cta uv-clickable-card">
          <span className="uv-modern-final-orbit uv-modern-final-orbit-one" aria-hidden="true" />
          <span className="uv-modern-final-orbit uv-modern-final-orbit-two" aria-hidden="true" />
          <p className="uv-eyebrow">Your first step is free</p>
          <h2>See what your next website could look like.</h2>
          <p>Email us about your business and we&apos;ll send your private preview. No card required.</p>
          <span className="uv-button uv-button-primary">
            Request my free preview <ArrowUpRight size={17} />
          </span>
        </Link>
      </section>
    </MarketingLayout>
  );
}
