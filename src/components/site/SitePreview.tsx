import { useEffect, useMemo, useState, type CSSProperties } from "react";

import {
  getDemoThemes,
  getRecommendedVisualDirection,
  visualDirectionDefinitions,
  visualDirections,
  type DemoVisualDirection,
} from "@/data/demo-themes";
import type { SiteConfig } from "@/data/site";
import { SiteConfigProvider } from "@/data/site-config-context";

import { About } from "./About";
import { Contact } from "./Contact";
import { Faq } from "./Faq";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { Services } from "./Services";
import { Testimonials } from "./Testimonials";
import { DemoLaunchControls } from "./DemoLaunchControls";

export function SitePreview({
  config,
  showDemoLaunchControls = false,
}: {
  config: SiteConfig;
  showDemoLaunchControls?: boolean;
}) {
  const themes = useMemo(() => getDemoThemes(config), [config]);
  const recommendedDirection = useMemo(() => getRecommendedVisualDirection(config), [config]);
  const storageKey = `website-factory-demo-theme:${config.brand.name.toLowerCase()}`;
  const directionStorageKey = `website-factory-demo-direction:${config.brand.name.toLowerCase()}`;
  const [themeId, setThemeId] = useState("original");
  const [directionId, setDirectionId] = useState<DemoVisualDirection>(recommendedDirection);
  const selectedTheme = themes.find((theme) => theme.id === themeId) ?? themes[0]!;
  const selectedDirection = visualDirectionDefinitions[directionId];

  useEffect(() => {
    if (!showDemoLaunchControls) return;
    const savedThemeId = window.localStorage.getItem(storageKey);
    if (savedThemeId && themes.some((theme) => theme.id === savedThemeId)) setThemeId(savedThemeId);
    const savedDirectionId = window.localStorage.getItem(
      directionStorageKey,
    ) as DemoVisualDirection | null;
    if (savedDirectionId && visualDirections.includes(savedDirectionId))
      setDirectionId(savedDirectionId);
  }, [showDemoLaunchControls, storageKey, directionStorageKey, themes]);

  function selectTheme(nextThemeId: string) {
    setThemeId(nextThemeId);
    window.localStorage.setItem(storageKey, nextThemeId);
  }

  function selectDirection(nextDirection: DemoVisualDirection) {
    setDirectionId(nextDirection);
    window.localStorage.setItem(directionStorageKey, nextDirection);
  }

  const themeStyle = showDemoLaunchControls
    ? ({ ...selectedTheme.variables, ...selectedDirection.variables } as CSSProperties)
    : undefined;
  return (
    <SiteConfigProvider config={config}>
      <div
        className={`${showDemoLaunchControls ? `demo-direction-${selectedDirection.id} ` : ""}min-h-screen bg-bone font-sans text-ink antialiased`}
        style={themeStyle}
      >
        <Header />
        <main>
          <Hero />
          <Services />
          <About />
          <Testimonials />
          <Faq />
          <Contact />
        </main>
        <Footer />
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
          />
        )}
      </div>
    </SiteConfigProvider>
  );
}
