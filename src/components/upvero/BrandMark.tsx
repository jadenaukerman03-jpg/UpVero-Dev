import { Link } from "@tanstack/react-router";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" aria-label="Upvero home" className="uv-brand">
      <span className="uv-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 64 64" focusable="false">
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#ef7f43" strokeWidth="5" d="M10 20c10-6 20-5 29 1 5 3 10 3 15-1" />
            <path stroke="#ef7f43" strokeWidth="5" d="M8 28c9-5 18-4 27 1 7 4 13 4 20 0" />
            <path stroke="#ef7f43" strokeWidth="5" d="M9 37c8-4 15-3 22 1 8 5 16 5 24 0" />
            <path stroke="#ef7f43" strokeWidth="5" d="M13 46c7-3 13-2 19 2 7 4 13 4 19 0" />
            <path stroke="#ef7f43" strokeWidth="5" d="M21 53c7-2 13-2 20 0" />
            <path stroke="#1e252b" strokeWidth="4.5" d="M14 45c8 0 11-5 15-12 2-4 3-9 3-15" />
            <path stroke="#1e252b" strokeWidth="4.5" d="M23 47c7-1 10-6 13-12 2-5 4-10 4-16" />
            <path stroke="#1e252b" strokeWidth="4.5" d="M26 22c3-2 5-4 6-7 2 3 4 5 7 7" />
          </g>
        </svg>
      </span>
      {!compact ? <span className="uv-brand-wordmark">Upvero</span> : null}
    </Link>
  );
}
