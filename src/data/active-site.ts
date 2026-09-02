import { defaultSiteConfig, siteConfigs, type SiteConfig } from "./site";

/**
 * Local proof-of-concept selector. It honors VITE_SITE_CONFIG only while Vite
 * is in development mode; production builds always retain the Vantage site.
 */
const developmentSiteKey = import.meta.env.DEV
  ? import.meta.env["VITE_SITE_CONFIG"]
  : undefined;

export const activeSiteConfig: SiteConfig =
  developmentSiteKey === "summitPeakRoofing"
    ? siteConfigs["summitPeakRoofing"]
    : defaultSiteConfig;
