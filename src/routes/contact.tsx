import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Mail, Phone } from "lucide-react";

import { MarketingLayout } from "@/components/upvero/MarketingLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Get your free website preview — Upvero" }] }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <MarketingLayout>
      <section className="uv-contact uv-container">
        <div>
          <p className="uv-eyebrow">Free website preview</p>
          <h1>
            Let’s build your <span>free preview</span>.
          </h1>
          <p className="uv-lead">
            Start by creating a private account, then use the protected Upvero workflow to create
            and save your website draft.
          </p>
          <div className="uv-contact-details">
            <p>
              <Mail size={17} /> Your account keeps your draft private.
            </p>
            <p>
              <Phone size={17} /> You can review your website before secure checkout.
            </p>
          </div>
        </div>
        <aside className="uv-contact-card">
          <CheckCircle2 size={32} aria-hidden="true" />
          <h2>Start your preview securely</h2>
          <p>
            Upvero’s current flow creates website drafts in the authenticated workspace so a draft
            cannot be claimed by another customer.
          </p>
          <Link to="/account" className="uv-button uv-button-primary">
            Create account or sign in
          </Link>
          <Link to="/dashboard" className="uv-text-link">
            Already signed in? Open your dashboard →
          </Link>
        </aside>
      </section>
    </MarketingLayout>
  );
}
