import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { subscriptionTiers } from "@/data/customization-tiers";
import { siteConfigSchema } from "@/data/site";

const accessTokenSchema = z.string().min(1);
const websiteStatusSchema = z.enum(["draft", "published", "archived"]);

function authorizationFailure(status: number, message: string): never {
  throw new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function requireWithinCustomerQuota(
  ownerId: string,
  operation: "business_creation" | "checkout_creation",
) {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
  const { data, error } = await createSupabaseAdminClient().rpc(
    "consume_provider_operation_quota",
    {
      p_owner_id: ownerId,
      p_operation: operation,
    },
  );
  if (error || data !== true)
    authorizationFailure(429, "Too many requests. Please try again later.");
}

async function requireAuthenticatedOwner(accessToken: string | undefined) {
  const { requireAuthenticatedCustomer } = await import("@/lib/supabase/server");
  try {
    return await requireAuthenticatedCustomer(accessToken ?? "");
  } catch {
    return authorizationFailure(401, "Sign in is required for this operation.");
  }
}

/**
 * Publishing is paid-only. The lookup intentionally accepts no tier, price,
 * provider, or subscription ID from the browser: it derives every association
 * from the owned website and the Stripe-webhook-maintained subscription row.
 */
async function requireActivePublishingEntitlement(
  client: ReturnType<(typeof import("@/lib/supabase/server"))["createCustomerSupabaseClient"]>,
  ownerId: string,
  website: { id: string; business_id: string },
) {
  const { data: subscription, error } = await client
    .from("subscriptions")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("business_id", website.business_id)
    .eq("website_id", website.id)
    .eq("provider", "stripe")
    .eq("status", "active")
    .maybeSingle();
  if (error || !subscription) {
    return authorizationFailure(
      403,
      "An active UpVero subscription is required to publish this website.",
    );
  }
}

export const createBusinessOperationScope = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        accessToken: accessTokenSchema,
        businessName: z.string().trim().min(1).max(160),
        industry: z.string().trim().max(160).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { requireAuthenticatedCustomer } = await import("@/lib/supabase/server");
    const { client, user } = await requireAuthenticatedCustomer(data.accessToken);
    await requireWithinCustomerQuota(user.id, "business_creation");
    const { data: business, error } = await client
      .from("businesses")
      .insert({ owner_id: user.id, name: data.businessName, industry: data.industry ?? null })
      .select("id")
      .single();
    if (error || !business) serverError(error, "create the business record");
    return business;
  });

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
      if (!business)
        throw new Error("This business is unavailable or does not belong to your account.");
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
      if (!website)
        throw new Error("This website is unavailable or does not belong to your account.");
    }

    const { data: draft, error } = await client
      .from("purchase_drafts")
      .insert({ owner_id: user.id, website_id: data.websiteId ?? null, selected_tier: data.tier })
      .select("id, selected_tier, created_at")
      .single();
    if (error || !draft) serverError(error, "save the purchase draft");
    return draft;
  });

export const createOwnedStripeCheckoutSession = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const parsed = z
      .object({
        accessToken: z.string().max(4096).optional(),
        websiteId: z.string().uuid(),
        tier: z.enum(subscriptionTiers),
      })
      .safeParse(data);
    if (parsed.success) return parsed.data;
    throw new Response(JSON.stringify({ error: "Invalid checkout request." }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  })
  .handler(async ({ data }) => {
    const { client, user } = await requireAuthenticatedOwner(data.accessToken);
    const { data: website, error: ownershipError } = await client
      .from("websites")
      .select("id, business_id")
      .eq("id", data.websiteId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (ownershipError || !website) {
      return authorizationFailure(404, "This website is unavailable.");
    }
    await requireWithinCustomerQuota(user.id, "checkout_creation");

    try {
      const { createStripeCheckoutSession } = await import("@/services/stripe-checkout.server");
      return await createStripeCheckoutSession({ owner: user, website, tier: data.tier });
    } catch (error) {
      // Keep provider and configuration internals server-side. The request is
      // logged with no secret values so deployment issues remain diagnosable.
      console.error("Stripe Checkout Session creation failed", {
        websiteId: website.id,
        ownerId: user.id,
        tier: data.tier,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return authorizationFailure(
        503,
        "Secure checkout is temporarily unavailable. Please try again.",
      );
    }
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

/** Returns a draft only after both token verification and the database RLS owner check succeed. */
export const getOwnedWebsite = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ accessToken: accessTokenSchema, websiteId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { requireAuthenticatedCustomer } = await import("@/lib/supabase/server");
    const { client } = await requireAuthenticatedCustomer(data.accessToken);
    const { data: website, error } = await client
      .from("websites")
      .select("id, name, status, business_id, site_config, created_at, updated_at")
      .eq("id", data.websiteId)
      .maybeSingle();
    if (error) serverError(error, "load the website draft");
    if (!website) authorizationFailure(404, "This website draft is unavailable.");
    return website;
  });

/** Deletes an unpublished draft only after customer RLS confirms ownership. */
export const deleteOwnedWebsiteDraft = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ accessToken: accessTokenSchema, websiteId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { requireAuthenticatedCustomer, createSupabaseAdminClient } = await import(
      "@/lib/supabase/server"
    );
    const { client, user } = await requireAuthenticatedCustomer(data.accessToken);
    const { data: draft, error: lookupError } = await client
      .from("websites")
      .select("id")
      .eq("id", data.websiteId)
      .eq("owner_id", user.id)
      .eq("status", "draft")
      .maybeSingle();
    if (lookupError) serverError(lookupError, "verify the website draft");
    if (!draft) authorizationFailure(404, "This website draft is unavailable.");

    // The database revokes direct customer DELETE access. This server-side
    // delete occurs only after the scoped customer client has proved ownership
    // and that the record is still an unpublished draft.
    const { data: deletedDraft, error: deleteError } = await createSupabaseAdminClient()
      .from("websites")
      .delete()
      .eq("id", draft.id)
      .eq("owner_id", user.id)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();
    if (deleteError) serverError(deleteError, "delete the website draft");
    if (!deletedDraft) authorizationFailure(404, "This website draft is unavailable.");
    return deletedDraft;
  });

/** Updates only a safe customer-editable design setting after RLS ownership checks. */
export const updateOwnedWebsiteVisualDirection = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        accessToken: accessTokenSchema,
        websiteId: z.string().uuid(),
        visualDirection: z.enum(["professional", "modern", "luxury", "friendly", "minimal"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { requireAuthenticatedCustomer } = await import("@/lib/supabase/server");
    const { client, user } = await requireAuthenticatedCustomer(data.accessToken);
    const { data: website, error: lookupError } = await client
      .from("websites")
      .select("id, site_config")
      .eq("id", data.websiteId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (lookupError) serverError(lookupError, "load the website draft");
    if (!website) authorizationFailure(404, "This website draft is unavailable.");

    const config = siteConfigSchema.safeParse(website.site_config);
    if (!config.success) throw new Error("This website draft has an invalid configuration.");
    const nextConfig = {
      ...config.data,
      design: { ...config.data.design, visualDirection: data.visualDirection },
    };
    const { data: updatedWebsite, error: updateError } = await client
      .from("websites")
      .update({ site_config: nextConfig })
      .eq("id", website.id)
      .eq("owner_id", user.id)
      .select("site_config")
      .maybeSingle();
    if (updateError) serverError(updateError, "update the visual direction");
    if (!updatedWebsite) authorizationFailure(404, "This website draft is unavailable.");
    return updatedWebsite;
  });

export const updateOwnedWebsiteStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const parsed = z
      .object({
        accessToken: z.string().max(4096).optional(),
        websiteId: z.string().uuid(),
        status: websiteStatusSchema,
      })
      .safeParse(data);
    if (parsed.success) return parsed.data;
    throw new Response(JSON.stringify({ error: "Invalid website status request." }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  })
  .handler(async ({ data }) => {
    const { client, user } = await requireAuthenticatedOwner(data.accessToken);
    const { data: ownedWebsite, error: ownershipError } = await client
      .from("websites")
      .select("id, business_id")
      .eq("id", data.websiteId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (ownershipError || !ownedWebsite) {
      return authorizationFailure(404, "This website is unavailable.");
    }

    if (data.status === "published") {
      await requireActivePublishingEntitlement(client, user.id, ownedWebsite);
    }

    // Publication state is intentionally written through the service client
    // only after the customer-scoped client has verified identity, ownership,
    // and the Stripe-webhook-maintained entitlement above.
    const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
    const { data: website, error } = await createSupabaseAdminClient()
      .from("websites")
      .update({ status: data.status })
      .eq("id", data.websiteId)
      .eq("owner_id", user.id)
      .select("id, status")
      .maybeSingle();
    if (error) serverError(error, "update the website status");
    if (!website)
      throw new Error("This website is unavailable or does not belong to your account.");
    return website;
  });
