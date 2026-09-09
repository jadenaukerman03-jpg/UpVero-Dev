import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { SitePreview } from "@/components/site/SitePreview";
import type { SiteConfig } from "@/data/site";
import type { DemoPresentationOverrides } from "@/data/generative-site";
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

  async function claim(presentationOverrides: DemoPresentationOverrides) {
    if (!claimToken || claiming) return;
    const { data } = await createBrowserSupabaseClient().auth.getSession();
    if (!data.session) {
      const destination = `/demo/${token}`;
      window.location.assign(`/account?next=${encodeURIComponent(destination)}`);
      return;
    }
    setClaiming(true);
    setClaimNotice("");
    try {
      const result = await claimDemo({
        data: {
          accessToken: data.session.access_token,
          previewToken: token,
          claimToken,
          presentationOverrides,
        },
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
    <SitePreview
      config={config}
      showDemoLaunchControls
      demoControlsInitiallyExpanded={false}
      allowAllDemoPreviewOptions
      leadCaptureTarget={{ kind: "private_demo", token }}
      demoLaunchLabel={
        claiming
          ? "Claiming website…"
          : claimToken
            ? "Buy & activate this website"
            : "This website has been claimed"
      }
      demoLaunchDisabled={claiming || !claimToken}
      demoLaunchNotice={claimNotice}
      showActivationGuide
      onDemoLaunch={(presentationOverrides) => void claim(presentationOverrides)}
    />
  );
}
