import { createFileRoute } from "@tanstack/react-router";
import { activeSiteConfig } from "@/data/active-site";
import { SitePreview } from "@/components/site/SitePreview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: activeSiteConfig.seo.title },
      {
        name: "description",
        content: activeSiteConfig.seo.description,
      },
      {
        property: "og:title",
        content: activeSiteConfig.seo.socialTitle,
      },
      {
        property: "og:description",
        content: activeSiteConfig.seo.socialDescription,
      },
      { property: "og:type", content: "website" },
      ...(activeSiteConfig.seo.socialImage
        ? [{ property: "og:image", content: activeSiteConfig.seo.socialImage }]
        : []),
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <SitePreview config={activeSiteConfig} showDemoLaunchControls />;
}
