# UpVero

UpVero is a TanStack Start application for researching businesses, generating private website
previews, managing customer-owned websites, and launching Stripe subscriptions. Supabase provides
authentication, persistence, ownership enforcement, and row-level security.

## Development

Use Bun and the committed lockfile:

```sh
bun install --frozen-lockfile
bun run dev
```

Copy `.env.example` to an ignored local `.env` file and configure the required values there. Never
commit `.env` files or server credentials.

## Validation

Run the complete local quality gate with:

```sh
bun run check
bun audit
```

The production build is also scanned to ensure server-only environment-variable names, common
credential formats, and the retired Lovable Supabase project URL are absent from browser assets.
GitHub Actions runs the same locked install, type-check, lint, tests, build, bundle verification, and
dependency audit for pull requests and pushes to protected branches.

## Deployment

The application is deployed as a server-rendered TanStack Start service. Public `VITE_*` Supabase
values are compiled into the browser application. OpenAI, Pexels, Stripe, Resend, Supabase server
credentials, and rate-limit secrets must remain private server environment variables.

Database changes belong in `supabase/migrations` and must be reviewed and applied to the intended
Supabase project separately from the application deployment.
