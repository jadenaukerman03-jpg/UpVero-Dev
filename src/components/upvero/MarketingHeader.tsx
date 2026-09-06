import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { BrandMark } from "./BrandMark";

const links = [
  { to: "/", label: "Home" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
] as const;

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

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
        </nav>
        <div className="uv-header-actions">
          <Link to="/account" className="uv-button uv-button-ghost">
            Sign in
          </Link>
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
          <Link to="/account" onClick={() => setOpen(false)} className="uv-nav-link">
            Sign in
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
