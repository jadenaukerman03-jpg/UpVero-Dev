import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { createLead } from "@/data/leads";
import { generateSiteConfigFromLead } from "@/services/generate-site-config-from-lead";
import { generateOwnedDraftSiteConfigWithAI } from "@/services/generate-site-config-with-ai";
import { sourceOwnedDraftImages } from "@/services/source-images-for-site";
import {
  getOwnedWebsite,
  saveGeneratedWebsite,
  updateOwnedWebsiteVisualDirection,
} from "@/services/customer-data";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { SitePreview } from "@/components/site/SitePreview";
import type { SiteConfig } from "@/data/site";
import type { DemoVisualDirection } from "@/data/demo-themes";

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
  serviceArea: string;
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
  serviceArea: "",
  primaryColor: "",
};

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
  const generateAiConfig = useServerFn(generateOwnedDraftSiteConfigWithAI);
  const sourceDraftImages = useServerFn(sourceOwnedDraftImages);
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
          serviceArea: config.brand.serviceArea,
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

  async function changeVisualDirection(visualDirection: DemoVisualDirection) {
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
        serviceAreas: fields.serviceArea
          .split(",")
          .map((area) => area.trim())
          .filter(Boolean),
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
      let personalizedConfig: SiteConfig = config;
      let aiGenerated = false;
      try {
        const generated = await generateAiConfig({
          data: {
            accessToken: auth.accessToken,
            businessId: saved.business_id,
            websiteId: saved.id,
            lead,
          },
        });
        if (generated instanceof Response) throw new Error("AI generation was unavailable.");
        personalizedConfig = generated as SiteConfig;
        aiGenerated = true;
      } catch {
        // The secure draft is still useful when a provider is temporarily
        // unavailable. It can be retried without losing the owner's work.
        setNotice("Your draft was saved. Personalized AI copy is temporarily unavailable; please try again shortly.");
      }
      try {
        const withImages = await sourceDraftImages({
          data: {
            accessToken: auth.accessToken,
            businessId: saved.business_id,
            websiteId: saved.id,
            lead,
            style: personalizedConfig.design?.visualDirection ?? "professional",
          },
        });
        if (!(withImages instanceof Response)) personalizedConfig = withImages as SiteConfig;
      } catch {
        // The responsive image-free layouts remain complete if Pexels is
        // temporarily unavailable or has no suitable result.
      }
      setPreview(personalizedConfig);
      setSavedWebsiteId(saved.id);
      if (aiGenerated) {
        setNotice("Your personalized website draft is ready. It has not been published.");
      }
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
              Service area <span>Optional</span>
              <input
                className="uv-input"
                maxLength={500}
                placeholder="e.g. Elkhart County, Indiana"
                value={fields.serviceArea}
                onChange={(event) => update("serviceArea", event.target.value)}
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
              Business summary <span>Required</span>
              <textarea
                className="uv-input"
                rows={4}
                required
                maxLength={8000}
                placeholder="Tell us what your business sells or does to make money, and what you want your website to look and feel like."
                value={fields.description}
                onChange={(event) => update("description", event.target.value)}
              />
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
          <SitePreview
            config={preview}
            showDemoLaunchControls
            demoControlsInitiallyExpanded={false}
            allowAllDemoPreviewOptions
            demoLaunchHref={savedWebsiteId ? `/launch?website=${savedWebsiteId}` : "/launch"}
            demoLaunchLabel="Choose a plan & go live"
            onDemoVisualDirectionChange={(direction) => {
              if (!updatingDirection) void changeVisualDirection(direction);
            }}
          />
        </section>
      ) : null}
    </div>
  );
}
