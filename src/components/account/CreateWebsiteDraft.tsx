import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { createLead } from "@/data/leads";
import { generateSiteConfigFromLead } from "@/services/generate-site-config-from-lead";
import {
  generateOwnedDraftSiteConfigWithAI,
  refineOwnedDraftSiteConfigWithAI,
} from "@/services/generate-site-config-with-ai";
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
import {
  generationQualityDefinitions,
  generationQualityModes,
  type GenerationQualityMode,
} from "@/data/site-generation";
import type { PreviewRenderAudit } from "@/lib/preview-audit";

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

const DEMO_UNAVAILABLE_MESSAGE =
  "We apologize, it appears demos are off currently. Please email us your site details and we'll get one sent right over to you.";

function accountRedirect() {
  window.location.replace("/account?next=%2Fdraft");
}

function normalizeColor(value: string): string | undefined {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : undefined;
}

function isLegacyGenericFallback(config: SiteConfig) {
  const copy =
    `${config.hero.headline} ${config.services.heading} ${config.services.items.map((item) => item.title).join(" ")}`.toLowerCase();
  return [
    "a thoughtful next step",
    "makes flight instructor straightforward",
    "professional service",
    "project support",
    "ongoing care",
  ].some((phrase) => copy.includes(phrase));
}

export function CreateWebsiteDraft({ websiteId }: { websiteId?: string }) {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [fields, setFields] = useState<DraftFields>(initialFields);
  const [preview, setPreview] = useState<SiteConfig>();
  const [savedWebsiteId, setSavedWebsiteId] = useState(websiteId);
  const [savedBusinessId, setSavedBusinessId] = useState<string>();
  const [qualityMode, setQualityMode] = useState<GenerationQualityMode>("studio");
  const [generationFailed, setGenerationFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingDirection, setUpdatingDirection] = useState(false);
  const getWebsite = useServerFn(getOwnedWebsite);
  const saveWebsite = useServerFn(saveGeneratedWebsite);
  const generateAiConfig = useServerFn(generateOwnedDraftSiteConfigWithAI);
  const refineAiConfig = useServerFn(refineOwnedDraftSiteConfigWithAI);
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
        setSavedBusinessId(website.business_id);
        setQualityMode(config.generation?.qualityMode ?? "studio");
        if (
          (!config.generation || config.generation.status === "complete") &&
          !isLegacyGenericFallback(config)
        ) {
          setPreview(config);
          setGenerationFailed(false);
        } else {
          setPreview(undefined);
          setGenerationFailed(true);
          setNotice(
            "This draft still needs personalized AI generation. Your business details are safe.",
          );
        }
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

  function currentLead() {
    return createLead({
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
  }

  async function personalizeDraft(businessId: string, draftWebsiteId: string) {
    if (auth.status !== "authenticated") throw new Error("Sign in is required.");
    const lead = currentLead();
    const generated = await generateAiConfig({
      data: {
        accessToken: auth.accessToken,
        businessId,
        websiteId: draftWebsiteId,
        lead,
        qualityMode,
      },
    });
    if (generated instanceof Response) throw new Error(DEMO_UNAVAILABLE_MESSAGE);
    let personalizedConfig = generated as SiteConfig;
    const withImages = await sourceDraftImages({
      data: {
        accessToken: auth.accessToken,
        businessId,
        websiteId: draftWebsiteId,
        lead,
        style: personalizedConfig.design?.visualDirection ?? "professional",
      },
    });
    if (withImages instanceof Response) throw new Error(DEMO_UNAVAILABLE_MESSAGE);
    personalizedConfig = withImages as SiteConfig;
    setPreview(personalizedConfig);
    setGenerationFailed(false);
    setNotice("Your personalized website draft is ready. It has not been published.");
  }

  async function retryPersonalization() {
    if (!savedBusinessId || !savedWebsiteId || saving) return;
    setSaving(true);
    setNotice("Rebuilding this draft with business-specific AI copy…");
    try {
      await personalizeDraft(savedBusinessId, savedWebsiteId);
    } catch {
      setGenerationFailed(true);
      setNotice(DEMO_UNAVAILABLE_MESSAGE);
    } finally {
      setSaving(false);
    }
  }

  async function refinePreview(
    instruction: string,
    nextQualityMode: GenerationQualityMode,
    renderAudit: PreviewRenderAudit,
  ) {
    if (!savedBusinessId || !savedWebsiteId || auth.status !== "authenticated") {
      throw new Error("Save the website before requesting an AI rework.");
    }
    try {
      const revised = await refineAiConfig({
        data: {
          accessToken: auth.accessToken,
          businessId: savedBusinessId,
          websiteId: savedWebsiteId,
          lead: currentLead(),
          qualityMode: nextQualityMode,
          instruction,
          renderAudit,
        },
      });
      if (revised instanceof Response) throw new Error(DEMO_UNAVAILABLE_MESSAGE);
      setQualityMode(nextQualityMode);
      setPreview(revised as SiteConfig);
    } catch {
      throw new Error(DEMO_UNAVAILABLE_MESSAGE);
    }
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
      const lead = currentLead();
      const primaryColor = normalizeColor(fields.primaryColor);
      const config = {
        ...generateSiteConfigFromLead(lead),
        generation: {
          status: "pending",
          qualityMode,
          estimatedCostCents: qualityMode === "efficient" ? 2.5 : qualityMode === "studio" ? 8 : 30,
          revision: 0,
        },
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
      setSavedWebsiteId(saved.id);
      setSavedBusinessId(saved.business_id);
      setPreview(undefined);
      window.history.replaceState({}, "", `/draft?website=${saved.id}`);
      try {
        await personalizeDraft(saved.business_id, saved.id);
      } catch {
        setGenerationFailed(true);
        setNotice(DEMO_UNAVAILABLE_MESSAGE);
      }
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
            <fieldset className="uv-draft-wide uv-quality-fieldset">
              <legend>Preview quality</legend>
              <div className="uv-quality-options">
                {generationQualityModes.map((mode) => {
                  const option = generationQualityDefinitions[mode];
                  return (
                    <label
                      key={mode}
                      className={`uv-quality-option ${qualityMode === mode ? "is-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="qualityMode"
                        value={mode}
                        checked={qualityMode === mode}
                        onChange={() => setQualityMode(mode)}
                      />{" "}
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                      <small>{option.estimatedCostLabel}</small>
                    </label>
                  );
                })}
              </div>
            </fieldset>
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
        {generationFailed && savedWebsiteId ? (
          <button
            type="button"
            className="uv-button uv-button-primary"
            disabled={saving}
            onClick={() => void retryPersonalization()}
          >
            {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
            Retry personalized generation
          </button>
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
            generationQualityMode={qualityMode}
            onGenerationQualityModeChange={setQualityMode}
            onDemoAiRefine={refinePreview}
          />
        </section>
      ) : null}
    </div>
  );
}
