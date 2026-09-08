import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { SitePreview } from "@/components/site/SitePreview";
import type { SiteConfig } from "@/data/site";
import { getPrivateProspectDemo } from "@/services/admin-registry";
import { claimPrivateProspectDemo } from "@/services/customer-data";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export const Route = createFileRoute("/demo/$token")({
  component: PrivateProspectDemoRoute,
});

function PrivateProspectDemoRoute() {
  const { token } = Route.useParams();
  const loadDemo = useServerFn(getPrivateProspectDemo);
  const claimDemo = useServerFn(claimPrivateProspectDemo);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [claimNotice, setClaimNotice] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    void loadDemo({ data: { token } })
      .then((result) => {
        if (!active) return;
        const loaded = result as { config: SiteConfig | null; claimToken?: string | null };
        if (loaded.config) {
          setConfig(loaded.config);
          setClaimToken(loaded.claimToken ?? null);
        } else setUnavailable(true);
      })
      .catch(() => {
        if (active) setUnavailable(true);
      });
    return () => {
      active = false;
    };
  }, [loadDemo, token]);

  async function claim() {
    if (!claimToken || claiming) return;
    const { data } = await createBrowserSupabaseClient().auth.getSession();
    if (!data.session) {
      const destination = `/demo/${token}?claim=${encodeURIComponent(claimToken)}`;
      window.location.assign(`/account?next=${encodeURIComponent(destination)}`);
      return;
    }
    setClaiming(true);
    setClaimNotice("");
    try {
      const result = await claimDemo({
        data: { accessToken: data.session.access_token, previewToken: token, claimToken },
      });
      const claimed = result as { websiteId: string };
      window.location.assign(`/launch?website=${encodeURIComponent(claimed.websiteId)}`);
    } catch (error) {
      setClaimNotice(error instanceof Error ? error.message : "Unable to claim this preview.");
    } finally {
      setClaiming(false);
    }
  }

  if (unavailable) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-100 px-6 text-center text-stone-900">
        <div className="max-w-md rounded-2xl border border-stone-300 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
            Upvero private preview
          </p>
          <h1 className="mt-3 text-2xl font-semibold">This preview is unavailable.</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            The link may be incomplete, expired, or no longer active.
          </p>
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

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-stone-300 bg-white p-4 shadow-lg">
        <p className="text-sm font-semibold text-stone-900">Like this website?</p>
        <p className="mt-1 text-sm text-stone-600">
          Claim this private draft, create your account, then choose a plan when you are ready.
        </p>
        {claimToken ? (
          <button
            type="button"
            className="mt-3 rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
            disabled={claiming}
            onClick={() => void claim()}
          >
            {claiming ? "Claiming preview…" : "Claim this website"}
          </button>
        ) : (
          <p className="mt-3 text-sm font-medium text-stone-700">
            This preview has already been claimed.
          </p>
        )}
        {claimNotice ? (
          <p className="mt-2 text-sm text-red-700" role="status">
            {claimNotice}
          </p>
        ) : null}
      </div>
      <SitePreview
        config={config}
        showVisualDirectionLayout
        leadCaptureTarget={{ kind: "private_demo", token }}
      />
    </>
  );
}
