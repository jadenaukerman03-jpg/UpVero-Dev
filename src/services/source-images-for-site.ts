import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { leadSchema } from "@/data/leads";
import { siteConfigSchema } from "@/data/site";
const sourcingRequestSchema = z.object({
  accessToken: z.string().max(4096).optional(),
  businessId: z.string().uuid(),
  websiteId: z.string().uuid().optional(),
  lead: leadSchema,
  style: z.enum(["professional", "modern", "luxury", "friendly", "minimal"]),
  sections: z
    .array(z.enum(["hero", "about"]))
    .min(1)
    .max(2)
    .optional(),
});

const ownedDraftSourcingRequestSchema = sourcingRequestSchema.extend({ websiteId: z.string().uuid() });

async function validateRequest(data: unknown) {
  const parsed = sourcingRequestSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  throw new Response(JSON.stringify({ error: "Invalid image sourcing request." }), {
    status: 400,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Server RPC boundary for Pexels-only image sourcing. */
export const sourceImagesForSiteServer = createServerFn({ method: "POST" })
  .validator(validateRequest)
  .handler(async ({ data }) => {
    const { authorizeProviderOperation } =
      await import("./provider-operation-authorization.server");
    await authorizeProviderOperation(data, { operation: "image_sourcing", adminOnly: true });
    const { sourceImagesForSite } = await import("./source-images-for-site.server");
    return sourceImagesForSite(data);
  });

/** Sources Pexels assets and persists them only on the caller's own draft. */
export const sourceOwnedDraftImages = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const parsed = ownedDraftSourcingRequestSchema.safeParse(data);
    if (parsed.success) return parsed.data;
    throw new Response(JSON.stringify({ error: "Invalid image sourcing request." }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  })
  .handler(async ({ data }) => {
    const { authorizeProviderOperation } =
      await import("./provider-operation-authorization.server");
    const { client, user } = await authorizeProviderOperation(data, { operation: "image_sourcing" });
    const { sourceImagesForSite } = await import("./source-images-for-site.server");
    const result = await sourceImagesForSite(data);
    const { data: website, error: websiteError } = await client
      .from("websites")
      .select("site_config")
      .eq("id", data.websiteId)
      .eq("business_id", data.businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (websiteError || !website) throw new Error("This website draft is unavailable.");
    const currentConfig = siteConfigSchema.safeParse(website.site_config);
    if (!currentConfig.success) throw new Error("This website draft has an invalid configuration.");
    const images = Object.fromEntries(
      result.assets.filter((asset) => asset.src).map((asset) => [asset.section, asset]),
    );
    const nextConfig = siteConfigSchema.parse({
      ...currentConfig.data,
      seo: images["hero"]?.src
        ? { ...currentConfig.data.seo, socialImage: images["hero"].src }
        : currentConfig.data.seo,
      assets: {
        hero: images["hero"]?.src
          ? { src: images["hero"].src, alt: images["hero"].alt }
          : currentConfig.data.assets.hero,
        about: images["about"]?.src
          ? { src: images["about"].src, alt: images["about"].alt }
          : currentConfig.data.assets.about,
      },
      assetAttributions: result.assets
        .filter((asset) => asset.sourceType === "pexels" && asset.originalSourceUrl)
        .map((asset) => ({
          label: asset.attribution || `Photo provided by ${asset.providerName || "Pexels"}`,
          href: asset.originalSourceUrl!,
        })),
    });
    const { data: updated, error: updateError } = await client
      .from("websites")
      .update({ site_config: nextConfig })
      .eq("id", data.websiteId)
      .eq("owner_id", user.id)
      .select("site_config")
      .maybeSingle();
    if (updateError || !updated) throw new Error("Unable to save website images.");
    return updated.site_config;
  });
