import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const accessTokenSchema = z.object({ accessToken: z.string().min(1).max(8192) });

/**
 * The browser only receives its own authorization result. The lookup runs with
 * the verified user token and admin_users RLS, so a browser flag can never
 * grant access.
 */
export const getCurrentAdminAccess = createServerFn({ method: "POST" })
  .validator((data: unknown) => accessTokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireAuthenticatedCustomer } = await import("@/lib/supabase/server");
    try {
      const { client, user } = await requireAuthenticatedCustomer(data.accessToken);
      const { data: row, error } = await client
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return { authenticated: true, isAdmin: false };
      return { authenticated: true, isAdmin: Boolean(row) };
    } catch {
      return { authenticated: false, isAdmin: false };
    }
  });

/**
 * Server-only administrative boundary for operations that spend provider
 * credits or expose internal tooling. The RLS query can only see the current
 * user's own allowlist row; no browser-provided role is trusted.
 */
export async function requireAdministrator(accessToken: string) {
  const { requireAuthenticatedCustomer } = await import("@/lib/supabase/server");
  let authenticated: Awaited<ReturnType<typeof requireAuthenticatedCustomer>>;
  try {
    authenticated = await requireAuthenticatedCustomer(accessToken);
  } catch {
    throw new Response(JSON.stringify({ error: "Sign in is required for this operation." }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const { client, user } = authenticated;
  const { data: row, error } = await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !row) {
    throw new Response(JSON.stringify({ error: "Administrator access is required." }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  return authenticated;
}
