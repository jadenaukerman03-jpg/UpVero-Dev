import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { leadSchema } from "@/data/leads";
import { siteConfigSchema } from "@/data/site";
import { imageSections, type ImageSection } from "@/data/visuals";
const sourcingRequestSchema = z.object({
  accessToken: z.string().max(4096).optional(),
  businessId: z.string().uuid(),
  websiteId: z.string().uuid().optional(),
  lead: leadSchema,
  style: z.enum(["professional", "modern", "luxury", "friendly", "minimal"]),
  sections: z.array(z.enum(imageSections)).min(1).max(imageSections.length).optional(),
});

const ownedDraftSourcingRequestSchema = sourcingRequestSchema.extend({
  websiteId: z.string().uuid(),
});

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
    const { client, user } = await authorizeProviderOperation(data, {
      operation: "image_sourcing",
    });
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
    if (currentConfig.data.siteSpecV3) {
      const { sourceImagesForSiteSpecV3 } = await import("./source-images-for-site.server");
      const result = await sourceImagesForSiteSpecV3(currentConfig.data.siteSpecV3);
      if (result.sourced === 0) throw new Error("Pexels could not source any suitable images.");
      const [hero, about, ...gallery] = result.spec.media.assets;
      const nextConfig = siteConfigSchema.parse({
        ...currentConfig.data,
        siteSpecV3: result.spec,
        seo: hero?.imageUrl
          ? { ...currentConfig.data.seo, socialImage: hero.imageUrl }
          : currentConfig.data.seo,
        assets: {
          hero: hero?.imageUrl
            ? { src: hero.imageUrl, alt: hero.alt, brief: hero.query }
            : currentConfig.data.assets.hero,
          about: about?.imageUrl
            ? { src: about.imageUrl, alt: about.alt, brief: about.query }
            : currentConfig.data.assets.about,
          gallery: gallery.slice(0, 4).map((asset) => ({
            ...(asset.imageUrl ? { src: asset.imageUrl } : {}),
            alt: asset.alt,
            brief: asset.query,
          })),
        },
        assetAttributions: result.spec.media.assets
          .filter((asset) => asset.sourceUrl && asset.attribution)
          .map((asset) => ({ label: asset.attribution!, href: asset.sourceUrl! })),
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
    }
    const galleryBriefs = currentConfig.data.assets.gallery ?? [];
    const briefs: Partial<Record<ImageSection, string>> = {
      hero: currentConfig.data.assets.hero.brief ?? currentConfig.data.assets.hero.alt,
      about: currentConfig.data.assets.about.brief ?? currentConfig.data.assets.about.alt,
    };
    (["showcase-1", "showcase-2", "showcase-3"] as const).forEach((section, index) => {
      const brief = galleryBriefs[index]?.brief ?? galleryBriefs[index]?.alt;
      if (brief) briefs[section] = brief;
    });
    const { sourceImagesForSite } = await import("./source-images-for-site.server");
    const result = await sourceImagesForSite({
      ...data,
      briefs,
    });
    const images = Object.fromEntries(
      result.assets.filter((asset) => asset.src).map((asset) => [asset.section, asset]),
    );
    const gallery = ["showcase-1", "showcase-2", "showcase-3"].map((section, index) => {
      const image = images[section];
      const current = currentConfig.data.assets.gallery?.[index];
      return image?.src
        ? { src: image.src, alt: image.alt, brief: current?.brief }
        : (current ?? { alt: `${currentConfig.data.brand.name} featured work ${index + 1}` });
    });
    const nextConfig = siteConfigSchema.parse({
      ...currentConfig.data,
      seo: images["hero"]?.src
        ? { ...currentConfig.data.seo, socialImage: images["hero"].src }
        : currentConfig.data.seo,
      assets: {
        hero: images["hero"]?.src
          ? {
              ...currentConfig.data.assets.hero,
              src: images["hero"].src,
              alt: images["hero"].alt,
            }
          : currentConfig.data.assets.hero,
        about: images["about"]?.src
          ? {
              ...currentConfig.data.assets.about,
              src: images["about"].src,
              alt: images["about"].alt,
            }
          : currentConfig.data.assets.about,
        gallery,
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
