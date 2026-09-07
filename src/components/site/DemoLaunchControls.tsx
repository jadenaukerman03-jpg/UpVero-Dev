import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";

import type { DemoTheme, DemoVisualDirection, VisualDirectionDefinition } from "@/data/demo-themes";
import {
  isOptionUnlocked,
  optionMinimumTier,
  tierDefinitions,
  type FontOption,
  type SubscriptionTier,
} from "@/data/customization-tiers";

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
};

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
}: DemoLaunchControlsProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

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

  if (!expanded) {
    return (
      <div
        ref={panelRef}
        className="fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-50 mx-auto max-w-md sm:right-6 sm:bottom-6 sm:left-auto"
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-ink/10 bg-bone/95 px-4 text-left shadow-2xl shadow-ink/20 backdrop-blur transition hover:bg-bone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
          aria-expanded={false}
          aria-label="Expand website controls"
        >
          <span>
            <span className="block text-xs font-semibold tracking-wide text-clay uppercase">
              Website settings
            </span>
            <span className="mt-0.5 block font-display text-base font-medium text-ink">
              Customize your preview
            </span>
          </span>
          <span
            className="grid size-8 place-items-center rounded-full bg-ink text-lg text-bone"
            aria-hidden="true"
          >
            +
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-50 mx-auto max-w-md sm:right-6 sm:bottom-6 sm:left-auto">
      <div
        ref={panelRef}
        className="rounded-2xl border border-ink/10 bg-bone/95 p-3 shadow-2xl shadow-ink/20 backdrop-blur sm:p-4"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight font-medium text-ink text-pretty">
              Your {businessName} Website Is Ready
            </p>
            <p className="mt-1 text-sm leading-snug text-ink/65">
              Choose a visual direction, colors, and typography.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="min-h-11 min-w-11 rounded-full text-sm font-medium text-ink/65 transition hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse website controls" : "Expand website controls"}
          >
            {expanded ? "−" : "+"}
          </button>
        </div>

        <div className="editor-settings-scroll mt-3 max-h-[min(25rem,calc(100svh-12rem))] overflow-y-auto pr-2">
          {!allowAllPreviewOptions && (
            <fieldset className="mt-3">
              <legend className="text-xs font-semibold tracking-wide text-ink/60 uppercase">
                Plan access
              </legend>
              <div
                className="mt-2 grid grid-cols-3 gap-2"
                role="radiogroup"
                aria-label="Website plan tier"
              >
                {(Object.keys(tierDefinitions) as SubscriptionTier[]).map((tierId) => {
                  const selected = tierId === tier;
                  const definition = tierDefinitions[tierId];
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
                      className={`min-h-11 rounded-xl border px-2 py-2 text-left text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${selected ? "border-ink bg-ink text-bone" : "border-ink/15 bg-white text-ink hover:bg-sand"}`}
                    >
                      <span className="block font-semibold">{definition.label}</span>
                      <span
                        className={`mt-0.5 block leading-snug ${selected ? "text-bone/65" : "text-ink/55"}`}
                      >
                        {tierId === "professional"
                          ? "Full platform access"
                          : tierId === "growth"
                            ? "More control"
                            : "Essentials"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs leading-snug text-ink/55">
                {tierDefinitions[tier].description}
              </p>
            </fieldset>
          )}
          <fieldset className="mt-3">
            <legend className="text-xs font-semibold tracking-wide text-ink/60 uppercase">
              Visual direction
            </legend>
            <div
              className="mt-2 grid grid-cols-2 gap-2"
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
                    className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${selected ? "border-ink bg-ink text-bone" : lockedBy ? "border-ink/10 bg-sand/45 text-ink/65 hover:bg-sand" : "border-ink/15 bg-white text-ink hover:bg-sand"}`}
                  >
                    <span className="block font-semibold">
                      {direction.id === recommendedDirection
                        ? `✓ Recommended · ${direction.label}`
                        : direction.label}
                    </span>
                    <span className={`mt-0.5 block ${selected ? "text-bone/65" : "text-ink/55"}`}>
                      {direction.description}
                    </span>
                    {lockedBy && (
                      <span className="mt-1 inline-flex items-center gap-1 font-semibold text-clay">
                        <Lock size={11} /> {lockedBy}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="mt-3">
            <legend className="text-xs font-semibold tracking-wide text-ink/60 uppercase">
              Choose your style
            </legend>
            <div
              className="mt-2 flex flex-wrap gap-2"
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
                    className={`min-h-11 rounded-full border px-3 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${selected ? "border-ink bg-ink text-bone" : lockedBy ? "border-ink/10 bg-sand/45 text-ink/65 hover:bg-sand" : "border-ink/15 bg-white text-ink hover:bg-sand"}`}
                  >
                    <span className="mr-1.5 inline-flex -space-x-1 align-middle" aria-hidden="true">
                      {theme.swatches.map((color) => (
                        <span
                          key={color}
                          className="size-3 rounded-full border border-white/70"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                    {theme.recommended ? "✓ " : ""}
                    {theme.label}
                    {lockedBy && (
                      <Lock
                        className="ml-1 inline-block"
                        size={11}
                        aria-label={`${lockedBy} required`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="mt-3">
            <legend className="text-xs font-semibold tracking-wide text-ink/60 uppercase">
              Fonts
            </legend>
            <div className="mt-2 grid gap-2">
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
                    className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${selected ? "border-ink bg-ink text-bone" : lockedBy ? "border-ink/10 bg-sand/45 text-ink/65 hover:bg-sand" : "border-ink/15 bg-white text-ink hover:bg-sand"}`}
                  >
                    <span className="block font-semibold">{font.label}</span>
                    <span className={`mt-0.5 block ${selected ? "text-bone/65" : "text-ink/55"}`}>
                      {font.description}
                    </span>
                    {lockedBy && (
                      <span className="mt-1 inline-flex items-center gap-1 font-semibold text-clay">
                        <Lock size={11} /> {lockedBy} required
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {upgradeMessage && (
            <p
              className="mt-3 rounded-lg bg-sand px-3 py-2 text-xs font-medium text-ink"
              role="status"
            >
              {upgradeMessage}
            </p>
          )}
        </div>

        <a
          href={launchHref}
          className="mt-3 flex min-h-11 items-center justify-center rounded-full bg-clay px-5 py-3 text-sm font-semibold text-bone transition-colors hover:bg-clay-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
        >
          {launchLabel}
        </a>
      </div>
    </div>
  );
}
