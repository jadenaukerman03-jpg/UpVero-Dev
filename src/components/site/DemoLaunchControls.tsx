import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Globe2,
  Image as ImageIcon,
  LayoutTemplate,
  Lock,
  Mail,
  Palette,
  SlidersHorizontal,
  Sparkles,
  Type,
} from "lucide-react";

import type { DemoTheme, DemoVisualDirection, VisualDirectionDefinition } from "@/data/demo-themes";
import type { GenerativeMediaSlot } from "@/data/generative-site";
import {
  isOptionUnlocked,
  optionMinimumTier,
  tierDefinitions,
  type FontOption,
  type SubscriptionTier,
} from "@/data/customization-tiers";
import {
  generationQualityDefinitions,
  generationQualityModes,
  type GenerationQualityMode,
} from "@/data/site-generation";

type DemoLaunchControlsProps = {
  businessName: string;
  themes: DemoTheme[];
  selectedTheme: DemoTheme;
  onSelectTheme: (themeId: string) => void;
  directions: VisualDirectionDefinition[];
  selectedDirection: DemoVisualDirection;
  recommendedDirection: DemoVisualDirection;
  onSelectDirection: (direction: DemoVisualDirection) => void;
  fonts: FontOption[];
  selectedFont: FontOption;
  onSelectFont: (fontId: string) => void;
  tier: SubscriptionTier;
  onTierChange: (tier: SubscriptionTier) => void;
  launchHref?: string | undefined;
  launchLabel?: string | undefined;
  /** Demo owners may try every visual option before selecting a plan. */
  allowAllPreviewOptions?: boolean;
  initiallyExpanded?: boolean;
  qualityMode?: GenerationQualityMode;
  onQualityModeChange?: ((mode: GenerationQualityMode) => void) | undefined;
  onAiRefine?:
    ((instruction: string, qualityMode: GenerationQualityMode) => Promise<void>) | undefined;
  customizableSections?: DemoCustomizableSection[] | undefined;
  onSectionStyleChange?:
    ((sectionId: string, backgroundColor: string, textColor: string) => void) | undefined;
  imageAreas?: DemoImageArea[] | undefined;
  imageOptions?: DemoImageOption[] | undefined;
  onSelectImage?: ((areaId: string, slot: GenerativeMediaSlot) => void) | undefined;
  onLaunch?: (() => void) | undefined;
  launchDisabled?: boolean;
  showActivationGuide?: boolean;
  launchNotice?: string | undefined;
  generativeMode?: boolean;
  creativeDirectionLabel?: string | undefined;
};

export type DemoCustomizableSection = {
  id: string;
  label: string;
  backgroundColor: string;
  textColor: string;
};

export type DemoImageArea = {
  id: string;
  label: string;
  selectedSlot: GenerativeMediaSlot;
};

export type DemoImageOption = {
  slot: GenerativeMediaSlot;
  label: string;
  src: string;
  alt: string;
};

type SettingsSection = "direction" | "colors" | "sections" | "images" | "fonts" | "ai" | "launch";

export function DemoLaunchControls({
  businessName,
  themes,
  selectedTheme,
  onSelectTheme,
  directions,
  selectedDirection,
  recommendedDirection,
  onSelectDirection,
  fonts,
  selectedFont,
  onSelectFont,
  tier,
  onTierChange,
  launchHref = "/launch",
  launchLabel = "🚀 Launch Your Website",
  allowAllPreviewOptions = false,
  initiallyExpanded = true,
  qualityMode = "studio",
  onQualityModeChange,
  onAiRefine,
  customizableSections = [],
  onSectionStyleChange,
  imageAreas = [],
  imageOptions = [],
  onSelectImage,
  onLaunch,
  launchDisabled = false,
  showActivationGuide = false,
  launchNotice,
  generativeMode = false,
  creativeDirectionLabel,
}: DemoLaunchControlsProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>(
    generativeMode ? "colors" : "direction",
  );
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [refining, setRefining] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(customizableSections[0]?.id ?? "");
  const [activeImageAreaId, setActiveImageAreaId] = useState(imageAreas[0]?.id ?? "");
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedDirectionLabel = generativeMode
    ? (creativeDirectionLabel ?? "AI art direction")
    : (directions.find((direction) => direction.id === selectedDirection)?.label ?? "Custom");
  const selectedThemeLabel =
    selectedTheme.id === "original" ? "Original palette" : selectedTheme.label;
  const selectedFontLabel =
    selectedFont.id === "original" ? "AI art-directed type" : selectedFont.label;
  const activeSection =
    customizableSections.find((section) => section.id === activeSectionId) ??
    customizableSections[0];
  const activeImageArea = imageAreas.find((area) => area.id === activeImageAreaId) ?? imageAreas[0];

  useEffect(() => {
    if (!customizableSections.some((section) => section.id === activeSectionId))
      setActiveSectionId(customizableSections[0]?.id ?? "");
  }, [activeSectionId, customizableSections]);

  useEffect(() => {
    if (!imageAreas.some((area) => area.id === activeImageAreaId))
      setActiveImageAreaId(imageAreas[0]?.id ?? "");
  }, [activeImageAreaId, imageAreas]);

  useEffect(() => {
    function collapseWhileExploringPreview(event: Event) {
      const target = event.target;
      if (!expanded || (target instanceof Node && panelRef.current?.contains(target))) return;
      setExpanded(false);
    }

    window.addEventListener("wheel", collapseWhileExploringPreview, { passive: true });
    window.addEventListener("touchmove", collapseWhileExploringPreview, { passive: true });
    return () => {
      window.removeEventListener("wheel", collapseWhileExploringPreview);
      window.removeEventListener("touchmove", collapseWhileExploringPreview);
    };
  }, [expanded]);

  function selectOption(
    control: "font" | "visual-direction" | "color-theme",
    optionId: string,
    onSelect: () => void,
  ) {
    if (allowAllPreviewOptions || isOptionUnlocked(tier, control, optionId)) {
      setUpgradeMessage("");
      onSelect();
      return;
    }
    setUpgradeMessage(
      `${tierDefinitions[optionMinimumTier(control, optionId)].label} unlocks this option.`,
    );
  }

  function lockLabel(control: "font" | "visual-direction" | "color-theme", id: string) {
    const requiredTier = optionMinimumTier(control, id);
    return allowAllPreviewOptions || isOptionUnlocked(tier, control, id)
      ? null
      : tierDefinitions[requiredTier].label;
  }

  if (!expanded)
    return (
      <div
        ref={panelRef}
        className="fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-50 mx-auto max-w-xl sm:right-6 sm:bottom-6 sm:left-auto"
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="group flex min-h-16 w-full items-center gap-3 rounded-full border border-bone/15 bg-ink/95 px-3.5 py-2 text-left text-bone shadow-2xl shadow-ink/25 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay sm:px-5"
          aria-expanded={false}
          aria-label="Expand website controls"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-clay text-bone">
            <SlidersHorizontal className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold tracking-[.16em] text-clay uppercase">
              Website studio
            </span>
            <span className="block truncate text-sm font-semibold">
              {selectedDirectionLabel} · {selectedThemeLabel} · {selectedFontLabel}
            </span>
          </span>
          <span className="hidden text-xs text-bone/55 sm:block">Customize</span>
          <ChevronDown className="size-4 shrink-0 rotate-180 text-bone/60" />
        </button>
      </div>
    );

  const settingsTabs: Array<{
    id: SettingsSection;
    label: string;
    icon: typeof LayoutTemplate;
  }> = [
    ...(generativeMode
      ? []
      : [{ id: "direction" as const, label: "Direction", icon: LayoutTemplate }]),
    { id: "colors", label: "Colors", icon: Palette },
    ...(customizableSections.length
      ? [{ id: "sections" as const, label: "Sections", icon: Palette }]
      : []),
    ...(imageAreas.length && imageOptions.length
      ? [{ id: "images" as const, label: "Images", icon: ImageIcon }]
      : []),
    { id: "fonts", label: "Type", icon: Type },
    ...(onAiRefine ? [{ id: "ai" as const, label: "AI", icon: Sparkles }] : []),
    ...(showActivationGuide ? [{ id: "launch" as const, label: "Go live", icon: Globe2 }] : []),
  ];

  return (
    <div className="fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-50 mx-auto max-w-xl sm:right-6 sm:bottom-6 sm:left-auto">
      <div
        ref={panelRef}
        className="overflow-hidden rounded-[1.75rem] border border-bone/15 bg-ink/95 text-bone shadow-2xl shadow-ink/30 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 border-b border-bone/10 px-4 py-3 sm:px-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-clay text-bone">
            <SlidersHorizontal className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Style {businessName}</p>
            <p className="text-xs text-bone/55">Changes appear instantly in the preview.</p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="grid size-10 place-items-center rounded-full text-bone/65 transition hover:bg-bone/10 hover:text-bone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            aria-expanded={true}
            aria-label="Collapse website controls"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>

        {!allowAllPreviewOptions && (
          <div className="border-b border-bone/10 px-4 py-3 sm:px-5">
            <div
              className="grid grid-cols-3 gap-1 rounded-xl bg-bone/5 p-1"
              role="radiogroup"
              aria-label="Website plan tier"
            >
              {(Object.keys(tierDefinitions) as SubscriptionTier[]).map((tierId) => {
                const selected = tierId === tier;
                return (
                  <button
                    key={tierId}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setUpgradeMessage("");
                      onTierChange(tierId);
                    }}
                    className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-clay ${selected ? "bg-bone text-ink" : "text-bone/60 hover:text-bone"}`}
                  >
                    {tierDefinitions[tierId].label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div
          className="editor-settings-tabs flex overflow-x-auto border-b border-bone/10 px-3 pt-2 sm:px-4"
          role="tablist"
          aria-label="Website settings"
        >
          {settingsTabs.map((tab) => {
            const selected = settingsSection === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSettingsSection(tab.id)}
                className={`flex min-h-11 shrink-0 items-center justify-center gap-2 border-b-2 px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-clay ${selected ? "border-clay text-bone" : "border-transparent text-bone/45 hover:text-bone/80"}`}
              >
                <Icon className="size-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="editor-settings-scroll max-h-[min(19rem,calc(100svh-18rem))] min-h-36 overflow-y-auto px-4 py-4 sm:px-5">
          {settingsSection === "direction" && (
            <div>
              <p className="mb-3 text-[11px] leading-relaxed text-bone/55">
                Change the complete visual treatment after generation. Your business content stays
                intact.
              </p>
              <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Website visual direction"
              >
                {directions.map((direction) => {
                  const selected = direction.id === selectedDirection;
                  const lockedBy = lockLabel("visual-direction", direction.id);
                  return (
                    <button
                      key={direction.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() =>
                        selectOption("visual-direction", direction.id, () =>
                          onSelectDirection(direction.id),
                        )
                      }
                      className={`relative min-h-20 rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${selected ? "border-clay bg-clay/15 text-bone" : "border-bone/10 bg-bone/5 text-bone/75 hover:border-bone/25 hover:bg-bone/10"}`}
                    >
                      <span className="block text-xs font-semibold">{direction.label}</span>
                      <span className="mt-1 block text-[11px] leading-snug text-bone/45">
                        {direction.description}
                      </span>
                      {direction.id === recommendedDirection && (
                        <span className="mt-2 inline-block text-[9px] font-bold tracking-wide text-clay uppercase">
                          Recommended
                        </span>
                      )}
                      {lockedBy && (
                        <span
                          className="absolute top-2 right-2"
                          aria-label={`${lockedBy} required`}
                        >
                          <Lock className="size-3 text-clay" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {settingsSection === "colors" && (
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Website color theme"
            >
              {themes.map((theme) => {
                const selected = theme.id === selectedTheme.id;
                const lockedBy = lockLabel("color-theme", theme.id);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      selectOption("color-theme", theme.id, () => onSelectTheme(theme.id))
                    }
                    className={`min-h-16 rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${selected ? "border-clay bg-clay/15" : "border-bone/10 bg-bone/5 hover:border-bone/25 hover:bg-bone/10"}`}
                  >
                    <span className="flex items-center justify-between gap-2 text-xs font-semibold text-bone">
                      {theme.label}
                      {lockedBy && <Lock className="size-3 text-clay" />}
                    </span>
                    <span className="mt-2 flex gap-1" aria-hidden="true">
                      {theme.swatches.map((color) => (
                        <span
                          key={color}
                          className="h-4 flex-1 rounded-full ring-1 ring-white/15"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {settingsSection === "sections" && activeSection && onSectionStyleChange && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-bone">
                Area
                <select
                  value={activeSection.id}
                  onChange={(event) => setActiveSectionId(event.target.value)}
                  className="mt-2 min-h-10 w-full rounded-xl border border-bone/15 bg-ink px-3 text-xs text-bone outline-none focus:border-clay"
                >
                  {customizableSections.map((section) => (
                    <option value={section.id} key={section.id}>
                      {section.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="rounded-xl border border-bone/10 bg-bone/5 p-3 text-xs font-semibold text-bone">
                  Background
                  <input
                    type="color"
                    value={activeSection.backgroundColor}
                    onChange={(event) =>
                      onSectionStyleChange(
                        activeSection.id,
                        event.target.value,
                        activeSection.textColor,
                      )
                    }
                    className="mt-2 h-11 w-full cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    aria-label={`${activeSection.label} background color`}
                  />
                  <span className="mt-1 block font-mono text-[10px] text-bone/55">
                    {activeSection.backgroundColor}
                  </span>
                </label>
                <label className="rounded-xl border border-bone/10 bg-bone/5 p-3 text-xs font-semibold text-bone">
                  Wording
                  <input
                    type="color"
                    value={activeSection.textColor}
                    onChange={(event) =>
                      onSectionStyleChange(
                        activeSection.id,
                        activeSection.backgroundColor,
                        event.target.value,
                      )
                    }
                    className="mt-2 h-11 w-full cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    aria-label={`${activeSection.label} wording color`}
                  />
                  <span className="mt-1 block font-mono text-[10px] text-bone/55">
                    {activeSection.textColor}
                  </span>
                </label>
              </div>
              <p className="text-[10px] leading-relaxed text-bone/50">
                Every color is available. If a wording color is too close to its background, Upvero
                automatically chooses readable black or white text.
              </p>
            </div>
          )}

          {settingsSection === "images" && activeImageArea && onSelectImage && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-bone">
                Image area
                <select
                  value={activeImageArea.id}
                  onChange={(event) => setActiveImageAreaId(event.target.value)}
                  className="mt-2 min-h-10 w-full rounded-xl border border-bone/15 bg-ink px-3 text-xs text-bone outline-none focus:border-clay"
                >
                  {imageAreas.map((area) => (
                    <option value={area.id} key={area.id}>
                      {area.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {imageOptions.map((image) => {
                  const selected = activeImageArea.selectedSlot === image.slot;
                  return (
                    <button
                      type="button"
                      key={`${activeImageArea.id}-${image.slot}`}
                      onClick={() => onSelectImage(activeImageArea.id, image.slot)}
                      className={`overflow-hidden rounded-xl border text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${selected ? "border-clay bg-clay/15" : "border-bone/10 bg-bone/5 hover:border-bone/30"}`}
                    >
                      <img src={image.src} alt="" className="aspect-[4/3] w-full object-cover" />
                      <span className="block truncate px-2 py-2 text-[10px] font-semibold text-bone">
                        {image.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {settingsSection === "fonts" && (
            <div className="grid gap-2" role="radiogroup" aria-label="Website typography">
              {fonts.map((font) => {
                const selected = font.id === selectedFont.id;
                const lockedBy = lockLabel("font", font.id);
                return (
                  <button
                    key={font.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => selectOption("font", font.id, () => onSelectFont(font.id))}
                    className={`flex min-h-16 items-center gap-4 rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${selected ? "border-clay bg-clay/15" : "border-bone/10 bg-bone/5 hover:border-bone/25 hover:bg-bone/10"}`}
                  >
                    <span
                      className="w-12 shrink-0 text-center text-3xl text-bone"
                      style={{ fontFamily: font.variables["--preview-font-display"] }}
                    >
                      Aa
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-bone">{font.label}</span>
                      <span className="mt-0.5 block text-[11px] text-bone/45">
                        {font.description}
                      </span>
                    </span>
                    {lockedBy && (
                      <Lock
                        className="size-3 shrink-0 text-clay"
                        aria-label={`${lockedBy} required`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {settingsSection === "ai" && onAiRefine && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-bone">Generation quality</p>
                <div
                  className="mt-2 grid grid-cols-3 gap-1"
                  role="radiogroup"
                  aria-label="AI generation quality"
                >
                  {generationQualityModes.map((mode) => {
                    const option = generationQualityDefinitions[mode];
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={qualityMode === mode}
                        onClick={() => onQualityModeChange?.(mode)}
                        className={`rounded-lg border px-2 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-clay ${qualityMode === mode ? "border-clay bg-clay/15" : "border-bone/10 bg-bone/5 hover:bg-bone/10"}`}
                      >
                        <span className="block text-[11px] font-semibold text-bone">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-[9px] leading-tight text-bone/45">
                          {option.estimatedCostLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <label
                className="block text-xs font-semibold text-bone"
                htmlFor="ai-website-instruction"
              >
                Tell the studio what to change
              </label>
              <textarea
                id="ai-website-instruction"
                rows={3}
                maxLength={1200}
                value={aiInstruction}
                onChange={(event) => setAiInstruction(event.target.value)}
                placeholder="Make the hero focus on weekly lawn care and give the page a more energetic visual rhythm."
                className="w-full resize-none rounded-xl border border-bone/15 bg-bone/5 px-3 py-2 text-xs text-bone outline-none placeholder:text-bone/30 focus:border-clay"
              />
              <button
                type="button"
                disabled={refining || aiInstruction.trim().length < 3}
                onClick={() => {
                  setRefining(true);
                  setAiStatus("");
                  void onAiRefine(aiInstruction.trim(), qualityMode)
                    .then(() => {
                      setAiInstruction("");
                      setAiStatus("The website was reworked and saved.");
                    })
                    .catch((error: unknown) =>
                      setAiStatus(error instanceof Error ? error.message : "AI rework failed."),
                    )
                    .finally(() => setRefining(false));
                }}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-clay px-4 text-xs font-semibold text-bone transition hover:bg-clay-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="size-3.5" />{" "}
                {refining ? "Reworking website…" : "Rework with AI"}
              </button>
              <p className="text-[10px] leading-relaxed text-bone/45">
                UpVero measures large gaps, overflow, and low-contrast text before the AI revision.
              </p>
              {aiStatus ? (
                <p className="rounded-lg bg-bone/5 px-3 py-2 text-xs text-bone" role="status">
                  {aiStatus}
                </p>
              ) : null}
            </div>
          )}

          {settingsSection === "launch" && showActivationGuide && (
            <div className="space-y-3 text-xs leading-relaxed text-bone/75">
              <p className="font-semibold text-bone">What happens after you choose this website</p>
              <ol className="space-y-2 pl-4 [list-style:decimal]">
                <li>Claim the private demo, create your account, and choose an Upvero plan.</li>
                <li>
                  Use a domain you own or register one through{" "}
                  <a
                    className="text-clay underline"
                    href="https://www.cloudflare.com/products/registrar/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Cloudflare Registrar
                  </a>{" "}
                  or{" "}
                  <a
                    className="text-clay underline"
                    href="https://www.namecheap.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Namecheap
                  </a>
                  .
                </li>
                <li>
                  Follow your host's DNS instructions and verify HTTPS before sharing the domain.
                </li>
                <li>
                  Forward website inquiries with{" "}
                  <a
                    className="text-clay underline"
                    href="https://developers.cloudflare.com/email-routing/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Cloudflare Email Routing
                  </a>{" "}
                  or create a mailbox with{" "}
                  <a
                    className="text-clay underline"
                    href="https://workspace.google.com/products/gmail/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Workspace
                  </a>
                  .
                </li>
              </ol>
              <p className="flex gap-2 rounded-xl bg-bone/5 p-3 text-bone/60">
                <Mail className="mt-0.5 size-3.5 shrink-0" /> Domain connection and mailbox setup
                remain guided steps; this preview does not publish itself.
              </p>
            </div>
          )}

          {upgradeMessage && (
            <p
              className="mt-3 rounded-lg bg-clay/15 px-3 py-2 text-xs font-medium text-bone"
              role="status"
            >
              {upgradeMessage}
            </p>
          )}
        </div>

        <div className="border-t border-bone/10 p-3 sm:px-4">
          {onLaunch ? (
            <button
              type="button"
              disabled={launchDisabled}
              onClick={onLaunch}
              className="group flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-clay px-5 py-3 text-sm font-semibold text-bone transition hover:-translate-y-0.5 hover:bg-clay-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:cursor-not-allowed disabled:opacity-50"
            >
              {launchLabel}{" "}
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          ) : (
            <a
              href={launchHref}
              className="group flex min-h-11 items-center justify-center gap-2 rounded-full bg-clay px-5 py-3 text-sm font-semibold text-bone transition hover:-translate-y-0.5 hover:bg-clay-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            >
              {launchLabel}{" "}
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          )}
          {launchNotice ? (
            <p className="mt-2 text-center text-[11px] leading-relaxed text-bone/70" role="status">
              {launchNotice}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
