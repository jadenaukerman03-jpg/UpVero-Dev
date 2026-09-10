import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

function requiredFingerprintSecret() {
  const secret = process.env["PUBLIC_FORM_RATE_LIMIT_SECRET"] || process.env["SUPABASE_SECRET_KEY"];
  if (!secret) throw new Error("Public form abuse protection is not configured on the server.");
  return secret;
}

/** Returns a stable, non-reversible client identifier without storing an IP address. */
export function getPublicFormClientKey(purpose: string) {
  const candidate = getRequestHeader("x-real-ip") || getRequestIP({ xForwardedFor: true });
  const address = candidate && isIP(candidate) ? candidate : "unavailable";
  return createHmac("sha256", requiredFingerprintSecret())
    .update(`upvero:${purpose}:${address}`)
    .digest("hex")
    .slice(0, 40);
}
