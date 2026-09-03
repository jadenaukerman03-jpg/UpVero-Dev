import { z } from "zod";

const externalProtocols = new Set(["https:", "mailto:", "tel:"]);

export function isSafeLinkHref(value: string): boolean {
  if (value.startsWith("#")) return true;
  try {
    return externalProtocols.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function isSafeHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export const safeLinkHrefSchema = z.string().min(1).refine(isSafeLinkHref, {
  message: "Use a hash, HTTPS, mailto, or telephone link.",
});

export const safeHttpsUrlSchema = z.string().url().refine(isSafeHttpsUrl, {
  message: "Use an HTTPS URL.",
});
