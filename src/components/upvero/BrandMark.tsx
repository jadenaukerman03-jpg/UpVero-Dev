import { Link } from "@tanstack/react-router";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" aria-label="Upvero home" className="uv-brand">
      <span className="uv-brand-mark" aria-hidden="true">
        U
      </span>
      {!compact ? <span>Upvero</span> : null}
    </Link>
  );
}
