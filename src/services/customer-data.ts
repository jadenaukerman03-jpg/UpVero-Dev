import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { subscriptionTiers } from "@/data/customization-tiers";
import { siteConfigSchema } from "@/data/site";

const accessTokenSchema = z.string().min(1);
const websiteStatusSchema = z.enum(["draft", "published", "archived"]);

function serverError(error: { message: string } | null, action: string): never {
  throw new Error(error?.message || `Unable to ${action}. Please try again.`);
}

export const saveGeneratedWebsite = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        accessToken: accessTokenSchema,
        businessId: z.string().uuid().optional(),
        businessName: z.string().trim().min(1).max(160),
        industry: z.string().trim().max(160).optional(),
        config: siteConfigSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { requireAuthenticatedCustomer } = await import("@/lib/supabase/server");
    const { client, user } = await requireAuthenticatedCustomer(data.accessToken);

    let businessId = data.businessId;
    if (businessId) {
      const { data: business, error } = await client
        .from("businesses")
        .select("id")
        .eq("id", businessId)
        .maybeSingle();
      if (error) serverError(error, "verify the business owner");
      if (!business) throw new Error("This business is unavailable or does not belong to your account.");
    } else {
      const { data: business, error } = await client
        .from("businesses")
        .insert({ owner_id: user.id, name: data.businessName, industry: data.industry ?? null })
        .select("id")
        .single();
      if (error || !business) serverError(error, "create the business record");
      businessId = business.id;
    }

    const { data: website, error } = await client
      .from("websites")
      .insert({
        owner_id: user.id,
        business_id: businessId,
        name: data.businessName,
        status: "draft",
        site_config: data.config,
      })
      .select("id, business_id, status, created_at")
      .single();
    if (error || !website) serverError(error, "save the website draft");
    return website;
  });

export const savePurchaseDraft = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        accessToken: accessTokenSchema,
        websiteId: z.string().uuid().optional(),
        tier: z.enum(subscriptionTiers),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { requireAuthenticatedCustomer } = await import("@/lib/supabase/server");
    const { client, user } = await requireAuthenticatedCustomer(data.accessToken);

    if (data.websiteId) {
      const { data: website, error } = await client
        .from("websites")
        .select("id")
        .eq("id", data.websiteId)
        .maybeSingle();
      if (error) serverError(error, "verify website ownership");
      if (!website) throw new Error("This website is unavailable or does not belong to your account.");
    }

    const { data: draft, error } = await client
      .from("purchase_drafts")
      .insert({ owner_id: user.id, website_id: data.websiteId ?? null, selected_tier: data.tier })
      .select("id, selected_tier, created_at")
      .single();
    if (error || !draft) serverError(error, "save the purchase draft");
    return draft;
  });

export const listOwnedWebsites = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ accessToken: accessTokenSchema }).parse(data))
  .handler(async ({ data }) => {
    const { requireAuthenticatedCustomer } = await import("@/lib/supabase/server");
    const { client } = await requireAuthenticatedCustomer(data.accessToken);
    const { data: websites, error } = await client
      .from("websites")
      .select("id, name, status, business_id, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) serverError(error, "load your websites");
    return websites;
  });

export const updateOwnedWebsiteStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ accessToken: accessTokenSchema, websiteId: z.string().uuid(), status: websiteStatusSchema })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { requireAuthenticatedCustomer } = await import("@/lib/supabase/server");
    const { client } = await requireAuthenticatedCustomer(data.accessToken);
    const { data: website, error } = await client
      .from("websites")
      .update({ status: data.status })
      .eq("id", data.websiteId)
      .select("id, status")
      .maybeSingle();
    if (error) serverError(error, "update the website status");
    if (!website) throw new Error("This website is unavailable or does not belong to your account.");
    return website;
  });
