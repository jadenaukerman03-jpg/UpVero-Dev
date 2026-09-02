import { useSiteConfig } from "@/data/site-config-context";

export function Footer() {
  const { brand, footer, assetAttributions } = useSiteConfig();
  return (
    <footer className="bg-ink">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 border-t border-bone/10 px-6 py-8 sm:flex-row sm:items-center sm:px-10">
        <p className="text-xs text-bone/50">
          © {new Date().getFullYear()} {brand.name} {footer.copyrightSuffix}
        </p>
        <p className="text-xs text-bone/40">{brand.license}</p>
      </div>
      {assetAttributions && assetAttributions.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 pb-5 text-xs text-bone/40 sm:px-10">
          {assetAttributions.map((attribution) => (
            <a
              key={attribution.href}
              href={attribution.href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-bone/70"
            >
              {attribution.label}
            </a>
          ))}
        </div>
      )}
    </footer>
  );
}
