import { useState } from "react";

import type { DemoTheme, DemoVisualDirection, VisualDirectionDefinition } from "@/data/demo-themes";

type DemoLaunchControlsProps = {
  businessName: string;
  themes: DemoTheme[];
  selectedTheme: DemoTheme;
  onSelectTheme: (themeId: string) => void;
  directions: VisualDirectionDefinition[];
  selectedDirection: DemoVisualDirection;
  recommendedDirection: DemoVisualDirection;
  onSelectDirection: (direction: DemoVisualDirection) => void;
  launchHref?: string;
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
  launchHref = "/launch",
}: DemoLaunchControlsProps) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-50 mx-auto max-w-md sm:right-6 sm:bottom-6 sm:left-auto">
      <div className="rounded-2xl border border-ink/10 bg-bone/95 p-3 shadow-2xl shadow-ink/20 backdrop-blur sm:p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight font-medium text-ink text-pretty">
              Your {businessName} Website Is Ready
            </p>
            {expanded && (
              <p className="mt-1 text-sm leading-snug text-ink/65">
                Choose a visual direction and colors, then launch your website when you’re ready.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="min-h-11 min-w-11 rounded-full text-sm font-medium text-ink/65 transition hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse website controls" : "Expand website controls"}
          >
            {expanded ? "−" : "+"}
          </button>
        </div>

        {expanded && (
          <>
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
                  return (
                    <button
                      key={direction.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onSelectDirection(direction.id)}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${selected ? "border-ink bg-ink text-bone" : "border-ink/15 bg-white text-ink hover:bg-sand"}`}
                    >
                      <span className="block font-semibold">
                        {direction.id === recommendedDirection
                          ? `✓ Recommended · ${direction.label}`
                          : direction.label}
                      </span>
                      <span className={`mt-0.5 block ${selected ? "text-bone/65" : "text-ink/55"}`}>
                        {direction.description}
                      </span>
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
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onSelectTheme(theme.id)}
                      className={`min-h-11 rounded-full border px-3 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${selected ? "border-ink bg-ink text-bone" : "border-ink/15 bg-white text-ink hover:bg-sand"}`}
                    >
                      <span
                        className="mr-1.5 inline-flex -space-x-1 align-middle"
                        aria-hidden="true"
                      >
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
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </>
        )}

        <a
          href={launchHref}
          className="mt-3 flex min-h-11 items-center justify-center rounded-full bg-clay px-5 py-3 text-sm font-semibold text-bone transition-colors hover:bg-clay-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
        >
          🚀 Launch Your Website
        </a>
      </div>
    </div>
  );
}
