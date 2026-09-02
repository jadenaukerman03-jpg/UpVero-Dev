import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/launch")({ component: LaunchWebsite });

function LaunchWebsite() {
  return (
    <main className="grid min-h-screen place-items-center bg-sand/40 px-6 text-ink">
      <section className="max-w-md rounded-2xl bg-bone p-8 text-center shadow-xl ring-1 ring-ink/10">
        <p className="text-sm font-semibold tracking-wide text-clay">Website Factory</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
          Your launch is ready to begin.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/65">
          This is the future-ready handoff for account creation, website claiming, domain
          connection, and publishing.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-clay px-5 py-3 text-sm font-semibold text-bone transition-colors hover:bg-clay-dark"
        >
          Back to your website
        </Link>
      </section>
    </main>
  );
}
