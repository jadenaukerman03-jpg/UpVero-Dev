-- A prospect demo is separate from a customer-owned website. Its random token
-- is the only public capability and exposes only the rendered SiteConfig.
create table public.prospect_demos (
  id uuid primary key default gen_random_uuid(),
  registry_candidate_id uuid not null unique references public.registry_candidates(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  preview_token uuid not null unique default gen_random_uuid(),
  status text not null default 'ready' check (status in ('ready', 'failed', 'expired')),
  site_config jsonb not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  last_error text
);

create index prospect_demos_preview_token_idx on public.prospect_demos(preview_token);
alter table public.prospect_demos enable row level security;
revoke all on table public.prospect_demos from anon, authenticated;
