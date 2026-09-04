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
