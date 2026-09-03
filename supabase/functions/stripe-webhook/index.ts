import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@22.6.0";

const supportedSubscriptionStatuses = new Set([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
]);

function requiredSecret(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function supabaseAdminKey() {
  // Older Supabase projects expose this directly. Newer projects provide the
  // current server-side keys as a JSON map, so safely support either format.
  const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyServiceRoleKey) return legacyServiceRoleKey;

  try {
    const secretKeys = JSON.parse(requiredSecret("SUPABASE_SECRET_KEYS")) as Record<string, string>;
    if (secretKeys.default) return secretKeys.default;
  } catch {
    // Use the safe, actionable error below without exposing any secret value.
  }

  throw new Error("A Supabase server-side service key is not configured.");
}

function subscriptionStatus(status: string) {
  return supportedSubscriptionStatuses.has(status) ? status : "incomplete";
}

function tierForPrice(priceId: string) {
  const configuredPrices = {
    launch: requiredSecret("STRIPE_PRICE_LAUNCH"),
    growth: requiredSecret("STRIPE_PRICE_GROWTH"),
    professional: requiredSecret("STRIPE_PRICE_PROFESSIONAL"),
  } as const;
  const tier = Object.entries(configuredPrices).find(
    ([, configuredPriceId]) => configuredPriceId === priceId,
  )?.[0];
  if (!tier) throw new Error("Stripe subscription uses a Price that is not configured for UpVero.");
  return tier as "launch" | "growth" | "professional";
}

function eventIdentifiers(event: Stripe.Event) {
  const object = event.data.object as Record<string, unknown>;
  return {
    stripeCustomerId: typeof object.customer === "string" ? object.customer : null,
    stripeSubscriptionId:
      typeof object.subscription === "string"
        ? object.subscription
        : typeof object.id === "string" && event.type.startsWith("customer.subscription.")
          ? object.id
          : null,
    stripeCheckoutSessionId:
      typeof object.id === "string" && event.type.startsWith("checkout.session.")
        ? object.id
        : null,
  };
}

function metadataFrom(object: Record<string, unknown>) {
  const metadata = object.metadata;
  return metadata && typeof metadata === "object" ? (metadata as Record<string, string>) : {};
}

function requireCheckoutOwnership(metadata: Record<string, string>) {
  const ownerId = metadata.upvero_user_id;
  const businessId = metadata.upvero_business_id;
  const websiteId = metadata.upvero_website_id;
  if (!ownerId || !businessId || !websiteId) {
    throw new Error("Checkout session is missing required UpVero ownership metadata.");
  }
  return { ownerId, businessId, websiteId };
}

async function assertOwnedWebsite(
  admin: ReturnType<typeof createClient>,
  ownership: ReturnType<typeof requireCheckoutOwnership>,
) {
  const { data, error } = await admin
    .from("websites")
    .select("id")
    .eq("id", ownership.websiteId)
    .eq("business_id", ownership.businessId)
    .eq("owner_id", ownership.ownerId)
    .maybeSingle();
  if (error || !data) throw new Error("Checkout metadata does not match an owned UpVero website.");
}

async function upsertCheckoutSubscription(
  admin: ReturnType<typeof createClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  if (typeof session.subscription !== "string" || typeof session.customer !== "string") {
    throw new Error(
      "Completed subscription checkout is missing its Stripe customer or subscription.",
    );
  }

  const ownership = requireCheckoutOwnership(session.metadata ?? {});
  await assertOwnedWebsite(admin, ownership);
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
  const priceId = lineItems.data.find((item) => typeof item.price?.id === "string")?.price?.id;
  if (!priceId) throw new Error("Completed checkout has no Stripe Price to map to an UpVero tier.");
  const tier = tierForPrice(priceId);
  const status =
    session.payment_status === "paid" || session.payment_status === "no_payment_required"
      ? "active"
      : "incomplete";

  const { error } = await admin.from("subscriptions").upsert(
    {
      owner_id: ownership.ownerId,
      business_id: ownership.businessId,
      website_id: ownership.websiteId,
      tier,
      status,
      provider: "stripe",
      provider_customer_id: session.customer,
      provider_subscription_id: session.subscription,
    },
    { onConflict: "provider_subscription_id" },
  );
  if (error) throw new Error(`Unable to persist the Stripe subscription: ${error.message}`);
}

async function updateSubscriptionLifecycle(
  admin: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
) {
  const { data: existing, error: lookupError } = await admin
    .from("subscriptions")
    .select("id")
    .eq("provider_subscription_id", subscription.id)
    .maybeSingle();
  if (lookupError)
    throw new Error(`Unable to load the Stripe subscription: ${lookupError.message}`);

  if (!existing) {
    // Checkout is responsible for creating an ownership-bound subscription row.
    // Never infer customer ownership from an unsolicited Stripe event.
    return;
  }

  const priceId = subscription.items.data.find((item) => typeof item.price.id === "string")?.price
    .id;
  if (!priceId) throw new Error("Stripe subscription has no Price to map to an UpVero tier.");

  const { error } = await admin
    .from("subscriptions")
    .update({
      status: subscriptionStatus(subscription.status),
      tier: tierForPrice(priceId),
      provider_customer_id:
        typeof subscription.customer === "string" ? subscription.customer : null,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("id", existing.id);
  if (error) throw new Error(`Unable to update the Stripe subscription: ${error.message}`);
}

async function updateInvoiceStatus(
  admin: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice,
  status: "active" | "past_due",
) {
  const invoiceRecord = invoice as unknown as Record<string, unknown>;
  const subscriptionId =
    typeof invoiceRecord.subscription === "string"
      ? invoiceRecord.subscription
      : (
          (invoiceRecord.parent as Record<string, unknown> | null)?.subscription_details as Record<
            string,
            unknown
          > | null
        )?.subscription;
  if (typeof subscriptionId !== "string") return;

  const { error } = await admin
    .from("subscriptions")
    .update({ status })
    .eq("provider_subscription_id", subscriptionId);
  if (error) throw new Error(`Unable to update the invoice subscription status: ${error.message}`);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing Stripe signature" }, { status: 400 });

  let event: Stripe.Event;
  let stripe: Stripe;
  try {
    const rawBody = await request.text();
    stripe = new Stripe(requiredSecret("STRIPE_SECRET_KEY"));
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      requiredSecret("STRIPE_WEBHOOK_SECRET"),
    );
  } catch {
    return Response.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const admin = createClient(requiredSecret("SUPABASE_URL"), supabaseAdminKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const identifiers = eventIdentifiers(event);

  const { data: recordedEvent, error: eventLookupError } = await admin
    .from("stripe_webhook_events")
    .select("id, processing_status, attempt_count")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (eventLookupError)
    return Response.json({ error: "Unable to record webhook event" }, { status: 500 });
  if (recordedEvent?.processing_status === "processed") {
    return Response.json({ received: true, duplicate: true });
  }

  let eventRecordId = recordedEvent?.id;
  if (recordedEvent) {
    const { error } = await admin
      .from("stripe_webhook_events")
      .update({
        processing_status: "processing",
        attempt_count: recordedEvent.attempt_count + 1,
        last_error: null,
      })
      .eq("id", recordedEvent.id);
    if (error) return Response.json({ error: "Unable to retry webhook event" }, { status: 500 });
  } else {
    const { data, error } = await admin
      .from("stripe_webhook_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        stripe_customer_id: identifiers.stripeCustomerId,
        stripe_subscription_id: identifiers.stripeSubscriptionId,
        stripe_checkout_session_id: identifiers.stripeCheckoutSessionId,
      })
      .select("id")
      .single();
    if (error?.code === "23505") return Response.json({ received: true, duplicate: true });
    if (error || !data)
      return Response.json({ error: "Unable to record webhook event" }, { status: 500 });
    eventRecordId = data.id;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await upsertCheckoutSubscription(
          admin,
          stripe,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await updateSubscriptionLifecycle(admin, event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await updateInvoiceStatus(admin, event.data.object as Stripe.Invoice, "active");
        break;
      case "invoice.payment_failed":
        await updateInvoiceStatus(admin, event.data.object as Stripe.Invoice, "past_due");
        break;
      default:
        break;
    }

    const { error } = await admin
      .from("stripe_webhook_events")
      .update({
        processing_status: "processed",
        processed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", eventRecordId!);
    if (error) throw new Error(`Unable to finalize webhook event: ${error.message}`);
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", { eventId: event.id, eventType: event.type });
    await admin
      .from("stripe_webhook_events")
      .update({
        processing_status: "failed",
        last_error:
          error instanceof Error ? error.message.slice(0, 500) : "Unknown processing error",
      })
      .eq("id", eventRecordId!);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
});
