import { Link } from "@tanstack/react-router";
import { Globe2, LogOut, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { BrandMark } from "@/components/upvero/BrandMark";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { listOwnedWebsites } from "@/services/customer-data";

type Website = {
  id: string;
  name: string;
  status: "draft" | "published" | "archived";
  business_id: string;
  created_at: string;
  updated_at: string;
};

export function CustomerDashboard() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [email, setEmail] = useState<string>();
  const [notice, setNotice] = useState("");
  const loadWebsites = useServerFn(listOwnedWebsites);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await createBrowserSupabaseClient().auth.getSession();
      if (!data.session) {
        window.location.assign("/account");
        return;
      }
      setEmail(data.session.user.email);
      const result = await loadWebsites({ data: { accessToken: data.session.access_token } });
      if (!active) return;
      if (result instanceof Response) {
        setNotice("Your websites could not be loaded. Please sign in again.");
        return;
      }
      setWebsites(result as Website[]);
    }
    void load();
    return () => {
      active = false;
    };
  }, [loadWebsites]);

  async function signOut() {
    await createBrowserSupabaseClient().auth.signOut();
    window.location.assign("/");
  }

  return (
    <div className="uv-app">
      <header className="uv-header">
        <div className="uv-container uv-header-inner">
          <BrandMark />
          <div className="uv-dashboard-actions">
            <span className="uv-user-email">{email ?? "Loading account…"}</span>
            <button type="button" className="uv-button uv-button-ghost" onClick={signOut}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="uv-dashboard uv-container">
        <p className="uv-eyebrow">Customer dashboard</p>
        <h1>Your websites</h1>
        <p className="uv-lead">
          Your drafts and live websites are private to your authenticated Upvero account.
        </p>
        <div className="uv-dashboard-toolbar">
          <Link
            to={import.meta.env.DEV ? "/factory" : "/contact"}
            className="uv-button uv-button-primary"
          >
            <Plus size={16} /> Create a website draft
          </Link>
          <Link to="/launch" className="uv-button uv-button-secondary">
            View plans
          </Link>
        </div>
        {notice ? (
          <p className="uv-notice" role="status">
            {notice}
          </p>
        ) : null}
        <section className="uv-website-grid" aria-label="Your saved websites">
          {websites.map((website) => (
            <article key={website.id} className="uv-website-card">
              <Globe2 size={20} aria-hidden="true" />
              <p className="uv-status">{website.status}</p>
              <h2>{website.name}</h2>
              <p>
                Last updated{" "}
                {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                  new Date(website.updated_at),
                )}
              </p>
              <Link to="/launch" className="uv-text-link">
                Manage plan and launch →
              </Link>
            </article>
          ))}
          {websites.length === 0 && !notice ? (
            <article className="uv-empty-card">
              <ShieldCheck size={24} aria-hidden="true" />
              <h2>No website drafts yet</h2>
              <p>Create a private draft, then use secure checkout when it is ready to launch.</p>
            </article>
          ) : null}
        </section>
      </main>
    </div>
  );
}
