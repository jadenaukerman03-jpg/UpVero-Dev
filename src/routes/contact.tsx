import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Mail, Phone } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { MarketingLayout } from "@/components/upvero/MarketingLayout";
import { submitSupportContactMessage } from "@/services/support-contact-messages";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Get your free website preview — Upvero" }] }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageState, setMessageState] = useState<"form" | "success" | "fading">("form");
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStartedAt, setFormStartedAt] = useState(() => Date.now());
  const submitMessage = useServerFn(submitSupportContactMessage);
  const supportEmail = import.meta.env["VITE_UPVERO_SUPPORT_EMAIL"]?.trim();

  useEffect(() => {
    if (messageState !== "success") return;

    const fadeTimer = window.setTimeout(() => setMessageState("fading"), 2700);
    const resetTimer = window.setTimeout(() => {
      setMessageState("form");
      setName("");
      setEmail("");
      setMessage("");
      setFormStartedAt(Date.now());
    }, 3000);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(resetTimer);
    };
  }, [messageState]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await submitMessage({
        data: {
          name,
          email,
          message,
          startedAt: formStartedAt,
          website: String(formData.get("website") ?? ""),
        },
      });
      if (result instanceof Response || !result.accepted) {
        throw new Error("Unable to send your message.");
      }
      setMessageState("success");
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Unable to send your message. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
        {messageState === "form" ? (
          <div className="uv-contact-message-card">
            <div>
              <p className="uv-eyebrow">Questions for Upvero?</p>
              <h2>Send us a message.</h2>
              <p>Tell us what you need help with and the Upvero team will receive it securely.</p>
              {supportEmail ? (
                <p className="uv-text-link">{supportEmail}</p>
              ) : (
                <p className="uv-notice" role="status">
                  The Upvero support inbox is being configured. You can still send us a message
                  here.
                </p>
              )}
            </div>
            <form className="uv-contact-message-form" onSubmit={sendMessage}>
              <div className="uv-honeypot" aria-hidden="true">
                <label htmlFor="support-website">Website</label>
                <input id="support-website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
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
              {submissionError ? (
                <p className="uv-form-error" role="alert">
                  {submissionError}
                </p>
              ) : null}
              <button type="submit" className="uv-button uv-button-primary" disabled={isSubmitting}>
                <Mail size={16} /> {isSubmitting ? "Sending…" : "Email Upvero"}
              </button>
            </form>
          </div>
        ) : (
          <div
            className={`uv-contact-message-success${messageState === "fading" ? " is-fading" : ""}`}
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 size={28} aria-hidden="true" />
            <p>Thanks for the message!</p>
          </div>
        )}
      </section>
    </MarketingLayout>
  );
}
