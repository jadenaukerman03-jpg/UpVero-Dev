import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { createLead } from "@/data/leads";
import { generateSiteConfigFromLead } from "@/services/generate-site-config-from-lead";
import {
  getOwnedWebsite,
  saveGeneratedWebsite,
  updateOwnedWebsiteVisualDirection,
} from "@/services/customer-data";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { SitePreview } from "@/components/site/SitePreview";
import type { SiteConfig } from "@/data/site";
import { visualStyleOptions, type VisualStyle } from "@/data/visuals";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; accessToken: string };

type DraftFields = {
  businessName: string;
  category: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  primaryColor: string;
};

const initialFields: DraftFields = {
  businessName: "",
  category: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  website: "",
  description: "",
  primaryColor: "",
};

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function accountRedirect() {
  window.location.replace("/account?next=%2Fdraft");
}

function normalizeColor(value: string): string | undefined {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : undefined;
}

export function CreateWebsiteDraft({ websiteId }: { websiteId?: string }) {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [fields, setFields] = useState<DraftFields>(initialFields);
  const [preview, setPreview] = useState<SiteConfig>();
  const [savedWebsiteId, setSavedWebsiteId] = useState(websiteId);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingDirection, setUpdatingDirection] = useState(false);
  const getWebsite = useServerFn(getOwnedWebsite);
  const saveWebsite = useServerFn(saveGeneratedWebsite);
  const updateVisualDirection = useServerFn(updateOwnedWebsiteVisualDirection);

  useEffect(() => {
    const client = createBrowserSupabaseClient();
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setAuth(
        data.session
          ? { status: "authenticated", accessToken: data.session.access_token }
          : { status: "anonymous" },
      );
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setAuth(
        session
          ? { status: "authenticated", accessToken: session.access_token }
          : { status: "anonymous" },
      );
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (auth.status !== "anonymous") return;
    accountRedirect();
  }, [auth.status]);

  useEffect(() => {
    if (!websiteId || auth.status !== "authenticated") return;
    let active = true;
    void getWebsite({ data: { accessToken: auth.accessToken, websiteId } })
      .then((website) => {
        if (!active || website instanceof Response) return;
        const config = website.site_config as SiteConfig;
        setPreview(config);
        setFields((current) => ({
          ...current,
          businessName: config.brand.name,
          category: config.brand.tagline.split(" · ")[0] ?? "",
          phone: config.brand.phone,
          email: config.brand.email,
          description: config.about.body,
          primaryColor: config.design?.primaryColor ?? "",
        }));
      })
      .catch(() => {
        if (active) setNotice("This website draft is unavailable.");
      });
    return () => {
      active = false;
    };
  }, [auth, getWebsite, websiteId]);

  function update<K extends keyof DraftFields>(key: K, value: DraftFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function changeVisualDirection(visualDirection: VisualStyle) {
    if (!preview || !savedWebsiteId || auth.status !== "authenticated" || updatingDirection) return;
    const previousConfig = preview;
    const nextConfig = {
      ...preview,
      design: { ...preview.design, visualDirection },
    } satisfies SiteConfig;
    setPreview(nextConfig);
    setUpdatingDirection(true);
    setNotice("");
    try {
      const updated = await updateVisualDirection({
        data: { accessToken: auth.accessToken, websiteId: savedWebsiteId, visualDirection },
      });
      if (updated instanceof Response) throw new Error("Unable to update the visual direction.");
      setPreview(updated.site_config as SiteConfig);
    } catch (error) {
      setPreview(previousConfig);
      setNotice(error instanceof Error ? error.message : "Unable to update the visual direction.");
    } finally {
      setUpdatingDirection(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (auth.status !== "authenticated") return;
    if (wordCount(fields.description) < 50) {
      setNotice("Please add at least 50 words about the business or the website you want to create.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const lead = createLead({
        businessName: fields.businessName,
        industry: fields.category || undefined,
        city: fields.city || undefined,
        state: fields.state || undefined,
        phone: fields.phone || undefined,
        email: fields.email || undefined,
        website: fields.website || undefined,
        businessDescription: fields.description || undefined,
        source: "customer-draft",
      });
      const primaryColor = normalizeColor(fields.primaryColor);
      const config = {
        ...generateSiteConfigFromLead(lead),
        design: primaryColor
          ? { visualDirection: "professional", primaryColor }
          : { visualDirection: "professional" },
      } satisfies SiteConfig;
      const saved = await saveWebsite({
        data: {
          accessToken: auth.accessToken,
          businessName: fields.businessName,
          industry: fields.category || undefined,
          config,
        },
      });
      if (saved instanceof Response) throw new Error("Unable to save your website draft.");
      setPreview(config);
      setSavedWebsiteId(saved.id);
      setNotice("Your private website draft is ready. It has not been published.");
      window.history.replaceState({}, "", `/draft?website=${saved.id}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create your website draft.");
    } finally {
      setSaving(false);
    }
  }

  if (auth.status === "loading") {
    return (
      <main className="uv-center-state">
        <LoaderCircle aria-hidden="true" className="animate-spin" />
        <p>Checking your secure session…</p>
      </main>
    );
  }
  if (auth.status === "anonymous") {
    return (
      <main className="uv-center-state">
        <p>Redirecting you to sign in…</p>
      </main>
    );
  }

  return (
    <div className="uv-app">
      <header className="uv-header">
        <div className="uv-container uv-header-inner">
          <Link to="/dashboard" className="uv-text-link">
            <ArrowLeft size={16} /> Dashboard
          </Link>
        </div>
      </header>
      <main className="uv-dashboard uv-container">
        <p className="uv-eyebrow">Private website draft</p>
        <h1>{websiteId ? "Your website preview" : "Create your website draft"}</h1>
        <p className="uv-lead">
          Start with what you know. You can add the remaining details later.
        </p>
        {!websiteId && (
          <form className="uv-auth-form uv-draft-form" onSubmit={submit}>
            <label>
              Business name
              <input
                className="uv-input"
                required
                maxLength={160}
                value={fields.businessName}
                onChange={(event) => update("businessName", event.target.value)}
              />
            </label>
            <label>
              Business category <span>Optional</span>
              <input
                className="uv-input"
                maxLength={160}
                placeholder="e.g. Residential roofing"
                value={fields.category}
                onChange={(event) => update("category", event.target.value)}
              />
            </label>
            <label>
              City <span>Optional</span>
              <input
                className="uv-input"
                maxLength={120}
                value={fields.city}
                onChange={(event) => update("city", event.target.value)}
              />
            </label>
            <label>
              State <span>Optional</span>
              <input
                className="uv-input"
                maxLength={40}
                value={fields.state}
                onChange={(event) => update("state", event.target.value)}
              />
            </label>
            <label>
              Phone number <span>Optional</span>
              <input
                className="uv-input"
                type="tel"
                maxLength={80}
                value={fields.phone}
                onChange={(event) => update("phone", event.target.value)}
              />
            </label>
            <label>
              Email <span>Optional</span>
              <input
                className="uv-input"
                type="email"
                maxLength={320}
                value={fields.email}
                onChange={(event) => update("email", event.target.value)}
              />
            </label>
            <label>
              Existing website <span>Optional</span>
              <input
                className="uv-input"
                type="url"
                maxLength={2048}
                placeholder="https://example.com"
                value={fields.website}
                onChange={(event) => update("website", event.target.value)}
              />
            </label>
            <label>
              Primary color <span>Optional, #RRGGBB</span>
              <input
                className="uv-input"
                pattern="#[0-9a-fA-F]{6}"
                placeholder="#E45F31"
                value={fields.primaryColor}
                onChange={(event) => update("primaryColor", event.target.value)}
              />
            </label>
            <label className="uv-draft-wide">
              Business description <span>Required · at least 50 words</span>
              <textarea
                className="uv-input"
                rows={4}
                required
                maxLength={8000}
                value={fields.description}
                onChange={(event) => update("description", event.target.value)}
              />
              <span className="uv-draft-word-count" aria-live="polite">
                {wordCount(fields.description)} / 50 words
              </span>
            </label>
            <button className="uv-button uv-button-primary uv-draft-wide" disabled={saving}>
              {saving ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} /> Creating your preview…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Create private preview
                </>
              )}
            </button>
          </form>
        )}
        {notice ? (
          <p className="uv-notice" role="status">
            {notice}
          </p>
        ) : null}
      </main>
      {preview ? (
        <section className="uv-draft-preview">
          <div className="uv-draft-preview-toolbar">
            <div>
              <p className="uv-eyebrow">Visual direction</p>
              <p>Try a different layout for your private preview.</p>
            </div>
            <div className="uv-draft-direction-options" role="radiogroup" aria-label="Visual direction">
              {visualStyleOptions.map((style) => {
                const selected = (preview.design?.visualDirection ?? "professional") === style;
                return (
                  <button
                    key={style}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={updatingDirection}
                    onClick={() => void changeVisualDirection(style)}
                    className={selected ? "is-selected" : undefined}
                  >
                    {style}
                  </button>
                );
              })}
            </div>
          </div>
          <SitePreview config={preview} showVisualDirectionLayout />
        </section>
      ) : null}
    </div>
  );
}
