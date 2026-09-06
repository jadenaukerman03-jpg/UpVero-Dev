import { Link } from "@tanstack/react-router";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" aria-label="Upvero home" className="uv-brand">
      <span className="uv-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 64 64" focusable="false">
          <path
            fill="#ef7f43"
            d="M24 4 6 21h11v16c0 10.6 7.2 18.5 17 20V45c-4.3-1.1-7-4.2-7-8.3V21h11L24 4Z"
          />
          <path
            fill="#1e252b"
            d="M34 57c10-1.5 17-9.8 17-20V16a5.5 5.5 0 0 0-11 0v20.7c0 4.1-2.7 7.2-6 8.3V57Z"
          />
        </svg>
      </span>
      {!compact ? <span className="uv-brand-wordmark">Upvero</span> : null}
    </Link>
  );
}
