import type { ReactNode } from "react";

import { MarketingFooter } from "./MarketingFooter";
import { MarketingHeader } from "./MarketingHeader";

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="uv-app">
      <MarketingHeader />
      <main className="uv-main">{children}</main>
      <MarketingFooter />
    </div>
  );
}
