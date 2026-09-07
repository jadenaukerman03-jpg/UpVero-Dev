import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Mail, Phone } from "lucide-react";
import { useState, type FormEvent } from "react";

import { MarketingLayout } from "@/components/upvero/MarketingLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Get your free website preview — Upvero" }] }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const supportEmail = import.meta.env["VITE_UPVERO_SUPPORT_EMAIL"]?.trim();

  function sendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supportEmail) return;
    const subject = `Upvero question from ${name.trim() || "a visitor"}`;
    const body = [
      `Name: ${name.trim() || "Not provided"}`,
      `Email: ${email.trim() || "Not provided"}`,
      "",
      message.trim(),
    ].join("\n");
    window.location.href = `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

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
      <section className="uv-section uv-container">
        <div className="uv-contact-message-card">
          <div>
            <p className="uv-eyebrow">Questions for Upvero?</p>
            <h2>Send us a message.</h2>
            <p>
              Tell us what you need help with. Submitting this form opens a new message addressed to
              the Upvero support inbox.
            </p>
            {supportEmail ? (
              <a className="uv-text-link" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
            ) : (
              <p className="uv-notice" role="status">
                The Upvero support inbox is being configured. Please check back shortly.
              </p>
            )}
          </div>
          <form className="uv-contact-message-form" onSubmit={sendEmail}>
            <label>
              Your name
              <input
                className="uv-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              Your email
              <input
                className="uv-input"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              How can we help?
              <textarea
                className="uv-input"
                rows={5}
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
            <button type="submit" className="uv-button uv-button-primary" disabled={!supportEmail}>
              <Mail size={16} /> Email Upvero
            </button>
          </form>
        </div>
      </section>
    </MarketingLayout>
  );
}
