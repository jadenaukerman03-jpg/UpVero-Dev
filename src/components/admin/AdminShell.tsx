import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { BrandMark } from "@/components/upvero/BrandMark";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getCurrentAdminAccess } from "@/services/admin-access";
import { AdminResearchTool } from "@/routes/factory";
import { RegistryPipeline } from "./RegistryPipeline";

export function AdminShell() {
  const [state, setState] = useState<"loading" | "unauthenticated" | "unauthorized" | "authorized">(
    "loading",
  );
  const getAccess = useServerFn(getCurrentAdminAccess);

  useEffect(() => {
    let active = true;
    async function authorize() {
      const { data } = await createBrowserSupabaseClient().auth.getSession();
      if (!data.session) {
        if (active) setState("unauthenticated");
        return;
      }
      const access = await getAccess({ data: { accessToken: data.session.access_token } });
      if (!active) return;
      setState(access.isAdmin ? "authorized" : "unauthorized");
    }
    void authorize();
    return () => {
      active = false;
    };
  }, [getAccess]);

  if (state === "loading")
    return <div className="uv-center-state">Checking administrator access…</div>;
  if (state === "unauthenticated") {
    window.location.replace("/account");
    return <div className="uv-center-state">Sign in is required.</div>;
  }
  if (state === "unauthorized") {
    return (
      <div className="uv-center-state">
        <ShieldAlert size={28} aria-hidden="true" />
        <h1>Administrator access required</h1>
        <p>This account is not authorized to access the Upvero admin command center.</p>
        <Link to="/dashboard" className="uv-button uv-button-secondary">
          Go to your dashboard
        </Link>
      </div>
    );
  }
  return (
    <div className="uv-app">
      <header className="uv-header">
        <div className="uv-container uv-header-inner">
          <BrandMark />
          <span className="uv-admin-label">Admin command center</span>
        </div>
      </header>
      <main>
        <div className="uv-dashboard uv-container">
          <p className="uv-eyebrow">Administrator</p>
          <h1>Command center</h1>
          <p className="uv-lead">Research a business and create its private, personalized demo.</p>
        </div>
        <AdminResearchTool embedded />
        <RegistryPipeline />
      </main>
    </div>
  );
}
