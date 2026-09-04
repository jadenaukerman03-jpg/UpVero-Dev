import { Link } from "@tanstack/react-router";

import { BrandMark } from "./BrandMark";

export function MarketingFooter() {
  return (
    <footer className="uv-footer">
      <div className="uv-container uv-footer-main">
        <div>
          <BrandMark />
          <p className="uv-footer-copy">
            Professional websites for local businesses — built, hosted, and maintained for one
            straightforward monthly plan.
          </p>
        </div>
        <nav className="uv-footer-nav" aria-label="Footer navigation">
          <Link to="/">Home</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/subscription">Subscription</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/account">Sign in</Link>
        </nav>
      </div>
      <div className="uv-footer-bottom">
        © {new Date().getFullYear()} Upvero. All rights reserved.
      </div>
    </footer>
  );
}
