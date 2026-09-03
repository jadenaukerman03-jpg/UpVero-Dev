import { createClient } from "@supabase/supabase-js";

function requiredServerEnvironment(name: "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY" | "SUPABASE_SECRET_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured on the server.`);
  return value;
}

/**
 * Server client scoped to a verified customer's access token. Database RLS
 * policies remain active and are the authorization boundary for every query.
 */
export function createCustomerSupabaseClient(accessToken: string) {
  return createClient(
    requiredServerEnvironment("SUPABASE_URL"),
    requiredServerEnvironment("SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  );
}

/**
 * Reserved for trusted server-only provisioning/webhook work. Never import this
 * from browser code and never use it for customer-initiated data access.
 */
export function createSupabaseAdminClient() {
  return createClient(
    requiredServerEnvironment("SUPABASE_URL"),
    requiredServerEnvironment("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );
}

export async function requireAuthenticatedCustomer(accessToken: string) {
  if (!accessToken) throw new Error("Sign in is required to access customer data.");

  const client = createCustomerSupabaseClient(accessToken);
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Your sign-in session is invalid or has expired.");
  return { client, user: data.user };
}
