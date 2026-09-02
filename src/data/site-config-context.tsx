import { createContext, useContext, type ReactNode } from "react";

import { activeSiteConfig } from "./active-site";
import type { SiteConfig } from "./site";

const SiteConfigContext = createContext<SiteConfig>(activeSiteConfig);

export function SiteConfigProvider({
  config,
  children,
}: {
  config: SiteConfig;
  children: ReactNode;
}) {
  return <SiteConfigContext.Provider value={config}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig(): SiteConfig {
  return useContext(SiteConfigContext);
}
