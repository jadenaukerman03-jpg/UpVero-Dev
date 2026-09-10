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
import {
  demoPresentationOverridesSchema,
  readableTextColor,
  type DemoPresentationOverrides,
  type GenerativeMediaSlot,
} from "@/data/generative-site";
import type { GenerationQualityMode } from "@/data/site-generation";
import { SiteConfigProvider } from "@/data/site-config-context";
import { createSemanticThemeTokens, repairGeneratedPalette } from "@/lib/color-contrast";
import {
  collectPreviewAudit,
  logContrastAuditInDevelopment,
  type PreviewRenderAudit,
} from "@/lib/preview-audit";

import { About } from "./About";
import { Contact } from "./Contact";
import { Faq } from "./Faq";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { Services } from "./Services";
import { Testimonials } from "./Testimonials";
import { DemoLaunchControls } from "./DemoLaunchControls";
import type { DemoCustomizableSection, DemoImageArea, DemoImageOption } from "./DemoLaunchControls";
import { CompositionalSiteRenderer } from "./CompositionalSiteRenderer";
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
  onDemoLaunch,
  demoLaunchDisabled = false,
  showActivationGuide = false,
  demoLaunchNotice,
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
  onDemoLaunch?: ((presentation: DemoPresentationOverrides) => void) | undefined;
  demoLaunchDisabled?: boolean;
  showActivationGuide?: boolean;
  demoLaunchNotice?: string | undefined;
}) {
  const previewRootRef = useRef<HTMLDivElement>(null);
  const themes = useMemo(() => getDemoThemes(config), [config]);
  const recommendedDirection = useMemo(
    () => config.generatedExperience?.recommendedDirection ?? getRecommendedVisualDirection(config),
    [config],
  );
  const storageKey = `website-factory-demo-theme:${config.brand.name.toLowerCase()}`;
  const directionStorageKey = `website-factory-demo-direction:${config.brand.name.toLowerCase()}`;
  const fontStorageKey = `website-factory-demo-font:${config.brand.name.toLowerCase()}`;
  const presentationStorageKey = `upvero-demo-presentation:${config.brand.name.toLowerCase()}`;
  const configuredThemeId = config.design?.paletteId;
  const configuredFontId = config.design?.fontId;
  const [themeId, setThemeId] = useState<string>(() =>
    (config.presentationOverrides?.themeId ?? configuredThemeId) &&
    themes.some(
      (theme) => theme.id === (config.presentationOverrides?.themeId ?? configuredThemeId),
    )
      ? (config.presentationOverrides?.themeId ?? configuredThemeId)!
      : "original",
  );
  const configuredDirection = config.design?.visualDirection;
  const [directionId, setDirectionId] = useState<DemoVisualDirection>(
    config.presentationOverrides?.visualDirection ?? configuredDirection ?? recommendedDirection,
  );
  const [fontId, setFontId] = useState<string>(() =>
    (config.presentationOverrides?.fontId ?? configuredFontId) &&
    fontOptions.some(
      (font) => font.id === (config.presentationOverrides?.fontId ?? configuredFontId),
    )
      ? (config.presentationOverrides?.fontId ?? configuredFontId)!
      : "original",
  );
  const [tier, setTier] = useState<SubscriptionTier>("launch");
  const [presentationOverrides, setPresentationOverrides] = useState<DemoPresentationOverrides>(
    () =>
      config.presentationOverrides ?? {
        sectionStyles: {},
        imageAssignments: {},
      },
  );
  const selectedTheme = themes.find((theme) => theme.id === themeId) ?? themes[0]!;
  const selectedDirection = visualDirectionDefinitions[directionId];
  const selectedGeneratedVariant = config.generatedExperience?.variants.find(
    (variant) => variant.direction === directionId,
  );
  const selectedFont = fontOptions.find((font) => font.id === fontId) ?? fontOptions[0]!;
  const generatedAccentOverride =
    selectedTheme.id !== "original" ? selectedTheme.swatches[2] : config.design?.primaryColor;
  const fallbackThemeTokens = createSemanticThemeTokens({
    background: selectedTheme.swatches[0],
    surface: selectedTheme.swatches[0],
    surfaceText: selectedTheme.swatches[1],
    text: selectedTheme.swatches[1],
    mutedText: selectedTheme.swatches[1],
    contrast: selectedTheme.swatches[1],
    contrastText: selectedTheme.swatches[0],
    accent: generatedAccentOverride ?? selectedTheme.swatches[2],
    accentText: selectedTheme.swatches[0],
  });

  useEffect(() => {
    const root = previewRootRef.current;
    if (!root) return;
    const frame = requestAnimationFrame(() => logContrastAuditInDevelopment(root));
    return () => cancelAnimationFrame(frame);
  }, [directionId, fontId, presentationOverrides, themeId]);

  function persistPresentation(next: DemoPresentationOverrides) {
    const validated = demoPresentationOverridesSchema.parse(next);
    setPresentationOverrides(validated);
    if (typeof window !== "undefined")
      window.localStorage.setItem(presentationStorageKey, JSON.stringify(validated));
  }

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
    const savedPresentation = window.localStorage.getItem(presentationStorageKey);
    if (savedPresentation) {
      try {
        const parsed = demoPresentationOverridesSchema.safeParse(JSON.parse(savedPresentation));
        if (parsed.success) setPresentationOverrides(parsed.data);
      } catch {
        window.localStorage.removeItem(presentationStorageKey);
      }
    }
  }, [
    showDemoLaunchControls,
    storageKey,
    directionStorageKey,
    fontStorageKey,
    presentationStorageKey,
    themes,
  ]);

  useEffect(() => {
    if (!showVisualDirectionLayout || showDemoLaunchControls) return;
    setDirectionId(config.design?.visualDirection ?? recommendedDirection);
    setThemeId(
      configuredThemeId && themes.some((theme) => theme.id === configuredThemeId)
        ? configuredThemeId
        : "original",
    );
    setFontId(
      configuredFontId && fontOptions.some((font) => font.id === configuredFontId)
        ? configuredFontId
        : "original",
    );
  }, [
    configuredFontId,
    configuredThemeId,
    config.design?.visualDirection,
    recommendedDirection,
    showDemoLaunchControls,
    showVisualDirectionLayout,
    themes,
  ]);

  function selectTheme(nextThemeId: string) {
    setThemeId(nextThemeId);
    window.localStorage.setItem(storageKey, nextThemeId);
    persistPresentation({ ...presentationOverrides, themeId: nextThemeId });
  }

  function selectDirection(nextDirection: DemoVisualDirection) {
    setDirectionId(nextDirection);
    window.localStorage.setItem(directionStorageKey, nextDirection);
    persistPresentation({ ...presentationOverrides, visualDirection: nextDirection });
    onDemoVisualDirectionChange?.(nextDirection);
  }

  function selectFont(nextFontId: string) {
    setFontId(nextFontId);
    window.localStorage.setItem(fontStorageKey, nextFontId);
    persistPresentation({ ...presentationOverrides, fontId: nextFontId });
  }

  function selectTier(nextTier: SubscriptionTier) {
    setTier(nextTier);
    if (!isOptionUnlocked(nextTier, "font", fontId)) selectFont("original");
    if (!isOptionUnlocked(nextTier, "visual-direction", directionId))
      selectDirection(recommendedDirection);
    if (!isOptionUnlocked(nextTier, "color-theme", themeId)) selectTheme("original");
  }

  const useVisualDirectionLayout =
    showDemoLaunchControls ||
    showVisualDirectionLayout ||
    Boolean(config.design?.blueprint) ||
    Boolean(config.generatedExperience);
  const themeStyle = useVisualDirectionLayout
    ? ({
        ...selectedTheme.variables,
        ...selectedDirection.variables,
        ...selectedFont.variables,
        "--bone": fallbackThemeTokens.pageBackground,
        "--sand": fallbackThemeTokens.surfaceBackground,
        "--ink": fallbackThemeTokens.primaryText,
        "--clay": fallbackThemeTokens.linkText,
        "--clay-dark": fallbackThemeTokens.buttonHoverBackground,
      } as CSSProperties)
    : config.design
      ? ({
          ...selectedDirection.variables,
          "--bone": fallbackThemeTokens.pageBackground,
          "--sand": fallbackThemeTokens.surfaceBackground,
          "--ink": fallbackThemeTokens.primaryText,
          "--clay": fallbackThemeTokens.linkText,
          "--clay-dark": fallbackThemeTokens.buttonHoverBackground,
        } as CSSProperties)
      : undefined;
  const customizableSections = useMemo<DemoCustomizableSection[]>(() => {
    if (!selectedGeneratedVariant) return [];
    const palette = repairGeneratedPalette(selectedGeneratedVariant.palette);
    const defaultsForTone = (tone: "base" | "contrast" | "accent") =>
      tone === "contrast"
        ? { backgroundColor: palette.contrast, textColor: palette.contrastText }
        : tone === "accent"
          ? { backgroundColor: palette.accent, textColor: palette.accentText }
          : { backgroundColor: palette.background, textColor: palette.text };
    const entries: DemoCustomizableSection[] = [
      {
        id: "header",
        label: "Header",
        backgroundColor: palette.background,
        textColor: palette.text,
      },
      ...selectedGeneratedVariant.sections.map((section) => ({
        id: section.id,
        label: section.kind === "hero" ? "Hero" : section.heading,
        ...defaultsForTone(section.kind === "contact" ? "contrast" : section.tone),
      })),
      {
        id: "footer",
        label: "Footer",
        backgroundColor: palette.contrast,
        textColor: palette.contrastText,
      },
    ];
    return entries.map((entry) => ({ ...entry, ...presentationOverrides.sectionStyles[entry.id] }));
  }, [presentationOverrides.sectionStyles, selectedGeneratedVariant]);

  const imageOptions = useMemo<DemoImageOption[]>(() => {
    const options: Array<{
      slot: GenerativeMediaSlot;
      label: string;
      asset?: SiteConfig["assets"]["hero"];
    }> = [
      { slot: "hero", label: "Hero image", asset: config.assets.hero },
      { slot: "about", label: "About image", asset: config.assets.about },
      ...(config.assets.gallery ?? []).slice(0, 3).map((asset, index) => ({
        slot: `gallery-${index + 1}` as GenerativeMediaSlot,
        label: `Gallery image ${index + 1}`,
        asset,
      })),
    ];
    return options
      .filter((option): option is typeof option & { asset: { src: string; alt: string } } =>
        Boolean(option.asset?.src),
      )
      .map((option) => ({
        slot: option.slot,
        label: option.label,
        src: option.asset.src,
        alt: option.asset.alt,
      }));
  }, [config.assets]);

  const imageAreas = useMemo<DemoImageArea[]>(() => {
    if (!selectedGeneratedVariant) return [];
    return selectedGeneratedVariant.sections.flatMap((section) => {
      if (section.kind === "gallery") {
        return [1, 2, 3].map((index) => {
          const id = `${section.id}:${index}`;
          const original = `gallery-${index}` as GenerativeMediaSlot;
          return {
            id,
            label: `${section.heading} — image ${index}`,
            selectedSlot: presentationOverrides.imageAssignments[id] ?? original,
          };
        });
      }
      if (section.mediaSlot === "none") return [];
      return [
        {
          id: section.id,
          label: section.kind === "hero" ? "Hero image" : section.heading,
          selectedSlot: presentationOverrides.imageAssignments[section.id] ?? section.mediaSlot,
        },
      ];
    });
  }, [presentationOverrides.imageAssignments, selectedGeneratedVariant]);

  function changeSectionStyle(sectionId: string, backgroundColor: string, textColor: string) {
    const accessibleText = readableTextColor(backgroundColor, textColor);
    persistPresentation({
      ...presentationOverrides,
      sectionStyles: {
        ...presentationOverrides.sectionStyles,
        [sectionId]: { backgroundColor: backgroundColor.toUpperCase(), textColor: accessibleText },
      },
    });
  }

  function changeImage(areaId: string, slot: GenerativeMediaSlot) {
    persistPresentation({
      ...presentationOverrides,
      imageAssignments: { ...presentationOverrides.imageAssignments, [areaId]: slot },
    });
  }
  return (
    <SiteConfigProvider config={config}>
      <div
        ref={previewRootRef}
        className={`${showDemoLaunchControls ? `demo-direction-${selectedDirection.id} pb-24 sm:pb-28 ` : ""}min-h-screen bg-bone font-sans text-ink antialiased`}
        style={themeStyle}
      >
        {selectedGeneratedVariant ? (
          <CompositionalSiteRenderer
            variant={selectedGeneratedVariant}
            leadCaptureTarget={leadCaptureTarget}
            fontOverride={fontId === "original" ? undefined : selectedFont.variables}
            accentOverride={generatedAccentOverride}
            presentationOverrides={presentationOverrides}
          />
        ) : useVisualDirectionLayout ? (
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
            customizableSections={customizableSections}
            onSectionStyleChange={changeSectionStyle}
            imageAreas={imageAreas}
            imageOptions={imageOptions}
            onSelectImage={changeImage}
            onLaunch={onDemoLaunch ? () => onDemoLaunch(presentationOverrides) : undefined}
            launchDisabled={demoLaunchDisabled}
            showActivationGuide={showActivationGuide}
            launchNotice={demoLaunchNotice}
          />
        )}
      </div>
    </SiteConfigProvider>
  );
}
