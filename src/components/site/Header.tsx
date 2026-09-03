import { useState } from "react";
import { useSiteConfig } from "@/data/site-config-context";
import { Menu, X } from "lucide-react";

export function Header() {
  const [open, setOpen] = useState(false);
  const { brand, header, navigation } = useSiteConfig();

  return (
    <header className="sticky top-0 z-50 border-b border-ink/8 bg-bone/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-10">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-ink">
            <span className="font-display text-sm font-semibold text-bone">{brand.shortName}</span>
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            {brand.name}
          </span>
        </a>

        <nav className="hidden items-center gap-8 text-sm font-medium text-ink/70 md:flex">
          {navigation.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-ink">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={header.primaryCta.href}
            className="hidden rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bone transition-colors hover:bg-ink/90 sm:inline-block"
          >
            {header.primaryCta.label}
          </a>
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen(!open)}
            className="grid size-9 place-items-center rounded-md text-ink md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-ink/8 bg-bone px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm font-medium text-ink/80">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="py-1">
                {item.label}
              </a>
            ))}
            <a
              href={header.primaryCta.href}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-ink px-5 py-2.5 text-center text-bone"
            >
              {header.primaryCta.label}
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
