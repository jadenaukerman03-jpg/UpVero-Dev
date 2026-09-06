import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { BrandMark } from "./BrandMark";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getCurrentAdminAccess } from "@/services/admin-access";

const links = [
  { to: "/", label: "Home" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
] as const;

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const getAdminAccess = useServerFn(getCurrentAdminAccess);

  useEffect(() => {
    let active = true;
    const client = createBrowserSupabaseClient();
    async function syncSession() {
      const { data } = await client.auth.getSession();
      if (!active) return;
      setIsAuthenticated(Boolean(data.session));
      if (!data.session) {
        setIsAdmin(false);
        return;
      }
      const access = await getAdminAccess({ data: { accessToken: data.session.access_token } });
      if (active) setIsAdmin(access.isAdmin);
    }
    void syncSession();
    const { data: listener } = client.auth.onAuthStateChange(() => void syncSession());
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [getAdminAccess]);

  return (
    <header className="uv-header">
      <div className="uv-container uv-header-inner">
        <BrandMark />
        <nav className="uv-nav uv-nav-desktop" aria-label="Primary navigation">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="uv-nav-link">
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link to="/admin" className="uv-nav-link">
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="uv-header-actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="uv-button uv-button-ghost">
              Your websites
            </Link>
          ) : (
            <Link to="/account" className="uv-button uv-button-ghost">
              Sign in
            </Link>
          )}
          <Link to="/contact" className="uv-button uv-button-primary">
            Get my preview
          </Link>
        </div>
        <button
          type="button"
          className="uv-menu-toggle"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open ? (
        <nav className="uv-mobile-nav uv-container" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setOpen(false)} className="uv-nav-link">
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link to="/admin" onClick={() => setOpen(false)} className="uv-nav-link">
              Admin
            </Link>
          ) : null}
          <Link
            to={isAuthenticated ? "/dashboard" : "/account"}
            onClick={() => setOpen(false)}
            className="uv-nav-link"
          >
            {isAuthenticated ? "Your websites" : "Sign in"}
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
