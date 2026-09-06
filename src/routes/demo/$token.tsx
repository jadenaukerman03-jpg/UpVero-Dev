import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { SitePreview } from "@/components/site/SitePreview";
import type { SiteConfig } from "@/data/site";
import { getPrivateProspectDemo } from "@/services/admin-registry";

export const Route = createFileRoute("/demo/$token")({
  component: PrivateProspectDemoRoute,
});

function PrivateProspectDemoRoute() {
  const { token } = Route.useParams();
  const loadDemo = useServerFn(getPrivateProspectDemo);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    void loadDemo({ data: { token } })
      .then((result) => {
        if (active) setConfig(result as SiteConfig);
      })
      .catch(() => {
        if (active) setUnavailable(true);
      });
    return () => {
      active = false;
    };
  }, [loadDemo, token]);

  if (unavailable) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-100 px-6 text-center text-stone-900">
        <div className="max-w-md rounded-2xl border border-stone-300 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">Upvero private preview</p>
          <h1 className="mt-3 text-2xl font-semibold">This preview is unavailable.</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">The link may be incomplete, expired, or no longer active.</p>
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-100 px-6 text-center text-stone-700">
        <p className="text-sm">Loading your private website preview…</p>
      </main>
    );
  }

  return <SitePreview config={config} showVisualDirectionLayout />;
}
