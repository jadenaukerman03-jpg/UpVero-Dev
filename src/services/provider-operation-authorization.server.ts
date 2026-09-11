import { z } from "zod";

import { tierDefinitions, type SubscriptionTier } from "@/data/customization-tiers";

export const providerOperationScopeSchema = z.object({
  accessToken: z.string().max(4096).optional(),
  businessId: z.string().uuid(),
  websiteId: z.string().uuid().optional(),
});

export type ProviderOperation = "business_research" | "ai_generation" | "image_sourcing";

function deny(statusCode: number, message: string): never {
  // A raw HTTP response gives callers a genuine 401/403/404/429 while keeping
  // the details deliberately minimal. It is handled by TanStack Start before
  // any provider module is imported.
  throw new Response(JSON.stringify({ error: message }), {
    status: statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

type AuthorizationOptions = {
  operation: ProviderOperation;
  minimumTier?: SubscriptionTier;
  adminOnly?: boolean;
};

export function shouldConsumeProviderQuota(options: Pick<AuthorizationOptions, "adminOnly">) {
  return options.adminOnly !== true;
}

/**
 * The sole authorization boundary for requests that may reach OpenAI or Pexels.
 * It completes identity, ownership, entitlement, and quota checks before a
 * provider module is imported or called.
 */
export async function authorizeProviderOperation(
  scope: z.infer<typeof providerOperationScopeSchema>,
  options: AuthorizationOptions,
) {
  const { requireAuthenticatedCustomer } = await import("@/lib/supabase/server");
  let authenticated: Awaited<ReturnType<typeof requireAuthenticatedCustomer>>;
  try {
    authenticated = await requireAuthenticatedCustomer(scope.accessToken ?? "");
  } catch {
    return deny(401, "Sign in is required for this operation.");
  }

  let { client, user } = authenticated;
  if (options.adminOnly) {
    const { requireAdministrator } = await import("./admin-access");
    const administrator = await requireAdministrator(scope.accessToken ?? "");
    client = administrator.client;
    user = administrator.user;
  }
  const { data: business, error: businessError } = await client
    .from("businesses")
    .select("id")
    .eq("id", scope.businessId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (businessError || !business) {
    return deny(404, "The requested business is unavailable.");
  }

  if (scope.websiteId) {
    const { data: website, error: websiteError } = await client
      .from("websites")
      .select("id")
      .eq("id", scope.websiteId)
      .eq("business_id", scope.businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (websiteError || !website) {
      return deny(404, "The requested website is unavailable.");
    }
  }

  if (options.minimumTier && !options.adminOnly) {
    let subscriptionQuery = client
      .from("subscriptions")
      .select("tier")
      .eq("owner_id", user.id)
      .eq("business_id", scope.businessId)
      .in("status", ["trialing", "active"]);
    if (scope.websiteId) subscriptionQuery = subscriptionQuery.eq("website_id", scope.websiteId);
    const { data: subscriptions, error: subscriptionError } = await subscriptionQuery;
    if (subscriptionError) deny(403, "Your plan could not be verified.");
    const requiredRank = tierDefinitions[options.minimumTier].rank;
    const entitled = (subscriptions ?? []).some(
      (subscription) =>
        tierDefinitions[subscription.tier as SubscriptionTier]?.rank >= requiredRank,
    );
    if (!entitled) deny(403, "An active UpVero plan is required for this operation.");
  }

  // Administrator operations are deliberate owner actions and may include
  // large approved registry batches. They retain authentication, the database
  // admin allowlist, and resource-ownership checks above, but are not subjected
  // to the customer abuse throttle.
  if (!shouldConsumeProviderQuota(options)) return { client, user };

  // This uses the server-only credential after all user-scoped checks above.
  // The quota RPC is intentionally not callable from the browser.
  const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
  const { data: withinQuota, error: quotaError } = await createSupabaseAdminClient().rpc(
    "consume_provider_operation_quota",
    { p_owner_id: user.id, p_operation: options.operation },
  );
  if (quotaError) deny(429, "This operation is temporarily unavailable. Please try again shortly.");
  if (withinQuota !== true)
    deny(429, "Your hourly request limit has been reached. Please try again later.");

  return { client, user };
}
