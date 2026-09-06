import { createHash } from "node:crypto";

import Stripe from "stripe";

import type { SubscriptionTier } from "@/data/customization-tiers";

const priceEnvironmentByTier: Record<SubscriptionTier, string> = {
  launch: "STRIPE_PRICE_LAUNCH",
  growth: "STRIPE_PRICE_GROWTH",
  professional: "STRIPE_PRICE_PROFESSIONAL",
};

type CheckoutOwner = {
  id: string;
  email?: string | null;
};

type CheckoutWebsite = {
  id: string;
  business_id: string;
};

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function configuredApplicationOrigin() {
  const value = requiredEnvironment("UPVERO_APP_URL");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("UPVERO_APP_URL must be a valid absolute URL.");
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("UPVERO_APP_URL must use HTTPS outside local development.");
  }
  return url.origin;
}

function checkoutRequestDigest(ownerId: string, websiteId: string, tier: SubscriptionTier) {
  // Replays in the same five-minute window return the same Stripe session;
  // changing a tier produces a distinct checkout request.
  const windowId = Math.floor(Date.now() / (5 * 60 * 1000));
  return createHash("sha256").update(`${ownerId}:${websiteId}:${tier}:${windowId}`).digest("hex");
}

function idempotencyKey(ownerId: string, websiteId: string, tier: SubscriptionTier) {
  return `upvero_checkout_${checkoutRequestDigest(ownerId, websiteId, tier)}`;
}

function integrationIdentifier(ownerId: string, websiteId: string, tier: SubscriptionTier) {
  // Stripe requires identical parameters when an idempotency key is reused.
  // Derive an opaque, eight-letter suffix from the same request identity.
  const suffix = checkoutRequestDigest(ownerId, websiteId, tier)
    .slice(0, 8)
    .split("")
    .map((character) => String.fromCharCode(97 + Number.parseInt(character, 16)))
    .join("");
  return `upvero_checkout_${suffix}`;
}

export async function createStripeCheckoutSession({
  owner,
  website,
  tier,
}: {
  owner: CheckoutOwner;
  website: CheckoutWebsite;
  tier: SubscriptionTier;
}) {
  const stripe = new Stripe(requiredEnvironment("STRIPE_SECRET_KEY"));
  const priceId = requiredEnvironment(priceEnvironmentByTier[tier]);
  const price = await stripe.prices.retrieve(priceId);

  // A configured identifier alone is insufficient: confirm it is a currently
  // usable recurring Price in the account associated with the server key.
  if (!price.active || !price.recurring) {
    throw new Error("Configured Stripe Price is not an active recurring subscription Price.");
  }

  const origin = configuredApplicationOrigin();
  const customerEmail = owner.email?.trim();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${origin}/launch?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/launch?checkout=cancelled`,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      client_reference_id: owner.id,
      metadata: {
        upvero_user_id: owner.id,
        upvero_business_id: website.business_id,
        upvero_website_id: website.id,
      },
      subscription_data: {
        metadata: {
          upvero_user_id: owner.id,
          upvero_business_id: website.business_id,
          upvero_website_id: website.id,
        },
      },
      integration_identifier: integrationIdentifier(owner.id, website.id, tier),
    },
    { idempotencyKey: idempotencyKey(owner.id, website.id, tier) },
  );

  if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
  return { url: session.url, sessionId: session.id };
}
