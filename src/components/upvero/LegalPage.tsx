import type { ReactNode } from "react";

import { MarketingLayout } from "./MarketingLayout";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <MarketingLayout>
      <section className="uv-legal uv-container">
        <p className="uv-eyebrow">Upvero legal</p>
        <h1>{title}</h1>
        <div className="uv-legal-content">{children}</div>
      </section>
    </MarketingLayout>
  );
}
