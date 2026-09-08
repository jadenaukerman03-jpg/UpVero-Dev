import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import {
  getDemoThemes,
  getRecommendedVisualDirection,
  visualDirectionDefinitions,
  visualDirections,
  type DemoVisualDirection,
} from "@/data/demo-themes";
import { fontOptions, isOptionUnlocked, type SubscriptionTier } from "@/data/customization-tiers";
import type { SiteConfig } from "@/data/site";
import type { GenerationQualityMode } from "@/data/site-generation";
import { SiteConfigProvider } from "@/data/site-config-context";
import { collectPreviewAudit, type PreviewRenderAudit } from "@/lib/preview-audit";

import { About } from "./About";
import { Contact } from "./Contact";
import { Faq } from "./Faq";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { Services } from "./Services";
import { Testimonials } from "./Testimonials";
import { DemoLaunchControls } from "./DemoLaunchControls";
import { VisualDirectionSite } from "./VisualDirectionSite";
import type { WebsiteLeadCaptureTarget } from "./Contact";

export function SitePreview({
  config,
  showDemoLaunchControls = false,
  showVisualDirectionLayout = false,
  leadCaptureTarget,
  demoLaunchHref,
  demoLaunchLabel,
  demoControlsInitiallyExpanded = true,
  allowAllDemoPreviewOptions = false,
  onDemoVisualDirectionChange,
  generationQualityMode = "studio",
  onGenerationQualityModeChange,
  onDemoAiRefine,
}: {
  config: SiteConfig;
  showDemoLaunchControls?: boolean;
  /** Renders the selected direction's full layout without exposing launch controls. */
  showVisualDirectionLayout?: boolean;
  /** Enables secure lead intake only when this rendered site has a verified public target. */
  leadCaptureTarget?: WebsiteLeadCaptureTarget | undefined;
  /** Destination for the protected plan-selection flow when previewing an owned draft. */
  demoLaunchHref?: string;
  /** Keeps the fixed preview action clear without changing the secure checkout flow. */
  demoLaunchLabel?: string;
  /** Customer drafts start compact so the website remains the focus. */
  demoControlsInitiallyExpanded?: boolean;
  /** Lets a prospect try visual choices; server-side plan enforcement still controls launch. */
  allowAllDemoPreviewOptions?: boolean;
  /** Optional persistence hook for a customer-owned draft's visual direction. */
  onDemoVisualDirectionChange?: (direction: DemoVisualDirection) => void;
  generationQualityMode?: GenerationQualityMode;
  onGenerationQualityModeChange?: (mode: GenerationQualityMode) => void;
  onDemoAiRefine?: (
    instruction: string,
    qualityMode: GenerationQualityMode,
    audit: PreviewRenderAudit,
  ) => Promise<void>;
}) {
  const previewRootRef = useRef<HTMLDivElement>(null);
  const themes = useMemo(() => getDemoThemes(config), [config]);
  const recommendedDirection = useMemo(() => getRecommendedVisualDirection(config), [config]);
  const storageKey = `website-factory-demo-theme:${config.brand.name.toLowerCase()}`;
  const directionStorageKey = `website-factory-demo-direction:${config.brand.name.toLowerCase()}`;
  const fontStorageKey = `website-factory-demo-font:${config.brand.name.toLowerCase()}`;
  const [themeId, setThemeId] = useState("original");
  const configuredDirection = config.design?.visualDirection;
  const [directionId, setDirectionId] = useState<DemoVisualDirection>(
    configuredDirection ?? recommendedDirection,
  );
  const [fontId, setFontId] = useState("original");
  const [tier, setTier] = useState<SubscriptionTier>("launch");
  const selectedTheme = themes.find((theme) => theme.id === themeId) ?? themes[0]!;
  const selectedDirection = visualDirectionDefinitions[directionId];
  const selectedFont = fontOptions.find((font) => font.id === fontId) ?? fontOptions[0]!;

  useEffect(() => {
    if (!showDemoLaunchControls) return;
    const savedThemeId = window.localStorage.getItem(storageKey);
    if (savedThemeId && themes.some((theme) => theme.id === savedThemeId)) setThemeId(savedThemeId);
    const savedDirectionId = window.localStorage.getItem(
      directionStorageKey,
    ) as DemoVisualDirection | null;
    if (savedDirectionId && visualDirections.includes(savedDirectionId))
      setDirectionId(savedDirectionId);
    const savedFontId = window.localStorage.getItem(fontStorageKey);
    if (savedFontId && fontOptions.some((font) => font.id === savedFontId)) setFontId(savedFontId);
  }, [showDemoLaunchControls, storageKey, directionStorageKey, fontStorageKey, themes]);

  useEffect(() => {
    if (!showVisualDirectionLayout || showDemoLaunchControls) return;
    setDirectionId(config.design?.visualDirection ?? recommendedDirection);
  }, [
    config.design?.visualDirection,
    recommendedDirection,
    showDemoLaunchControls,
    showVisualDirectionLayout,
  ]);

  function selectTheme(nextThemeId: string) {
    setThemeId(nextThemeId);
    window.localStorage.setItem(storageKey, nextThemeId);
  }

  function selectDirection(nextDirection: DemoVisualDirection) {
    setDirectionId(nextDirection);
    window.localStorage.setItem(directionStorageKey, nextDirection);
    onDemoVisualDirectionChange?.(nextDirection);
  }

  function selectFont(nextFontId: string) {
    setFontId(nextFontId);
    window.localStorage.setItem(fontStorageKey, nextFontId);
  }

  function selectTier(nextTier: SubscriptionTier) {
    setTier(nextTier);
    if (!isOptionUnlocked(nextTier, "font", fontId)) selectFont("original");
    if (!isOptionUnlocked(nextTier, "visual-direction", directionId))
      selectDirection(recommendedDirection);
    if (!isOptionUnlocked(nextTier, "color-theme", themeId)) selectTheme("original");
  }

  const useVisualDirectionLayout =
    showDemoLaunchControls || showVisualDirectionLayout || Boolean(config.design?.blueprint);
  const themeStyle = useVisualDirectionLayout
    ? ({
        ...selectedTheme.variables,
        ...selectedDirection.variables,
        ...selectedFont.variables,
        ...(config.design?.primaryColor ? { "--clay": config.design.primaryColor } : {}),
      } as CSSProperties)
    : config.design
      ? ({
          ...selectedDirection.variables,
          ...(config.design.primaryColor ? { "--clay": config.design.primaryColor } : {}),
        } as CSSProperties)
      : undefined;
  return (
    <SiteConfigProvider config={config}>
      <div
        ref={previewRootRef}
        className={`${showDemoLaunchControls ? `demo-direction-${selectedDirection.id} pb-24 sm:pb-28 ` : ""}min-h-screen bg-bone font-sans text-ink antialiased`}
        style={themeStyle}
      >
        {useVisualDirectionLayout ? (
          <VisualDirectionSite direction={directionId} leadCaptureTarget={leadCaptureTarget} />
        ) : (
          <>
            <Header />
            <main>
              <Hero />
              <Services />
              <About />
              <Testimonials />
              <Faq />
              <Contact leadCaptureTarget={leadCaptureTarget} />
            </main>
            <Footer />
          </>
        )}
        {showDemoLaunchControls && (
          <DemoLaunchControls
            businessName={config.brand.name}
            themes={themes}
            selectedTheme={selectedTheme}
            onSelectTheme={selectTheme}
            directions={visualDirections.map((direction) => visualDirectionDefinitions[direction])}
            selectedDirection={directionId}
            recommendedDirection={recommendedDirection}
            onSelectDirection={selectDirection}
            fonts={fontOptions}
            selectedFont={selectedFont}
            onSelectFont={selectFont}
            tier={tier}
            onTierChange={selectTier}
            launchHref={demoLaunchHref}
            launchLabel={demoLaunchLabel}
            initiallyExpanded={demoControlsInitiallyExpanded}
            allowAllPreviewOptions={allowAllDemoPreviewOptions}
            qualityMode={generationQualityMode}
            onQualityModeChange={onGenerationQualityModeChange}
            onAiRefine={
              onDemoAiRefine
                ? async (instruction, qualityMode) => {
                    if (!previewRootRef.current)
                      throw new Error("The preview is not ready to inspect.");
                    await onDemoAiRefine(
                      instruction,
                      qualityMode,
                      collectPreviewAudit(previewRootRef.current),
                    );
                  }
                : undefined
            }
          />
        )}
      </div>
    </SiteConfigProvider>
  );
}
