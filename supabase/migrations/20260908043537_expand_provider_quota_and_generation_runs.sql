-- The server-only quota RPC added business_creation and checkout_creation in
-- 20260903120000, but the original table constraint still rejected those two
-- values. Replace only that stale constraint; existing rows are unchanged.
alter table public.provider_operation_quota_windows
  drop constraint if exists provider_operation_quota_windows_operation_check;

alter table public.provider_operation_quota_windows
  add constraint provider_operation_quota_windows_operation_check
  check (operation in (
    'business_research',
    'ai_generation',
    'image_sourcing',
    'business_creation',
    'checkout_creation'
  ));

-- Private, append-only accounting for generation quality, cost, and failures.
-- Browser roles receive no table privileges; server functions use service_role.
create table if not exists public.website_generation_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  website_id uuid references public.websites (id) on delete cascade,
  quality_mode text not null check (quality_mode in ('efficient', 'studio', 'signature')),
  status text not null check (status in ('started', 'completed', 'failed')),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_cents numeric(10, 4) not null default 0 check (estimated_cost_cents >= 0),
  actual_cost_cents numeric(10, 4) not null default 0 check (actual_cost_cents >= 0),
  quality_score integer check (quality_score between 0 and 100),
  models text[] not null default '{}',
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists website_generation_runs_owner_created_idx
  on public.website_generation_runs (owner_id, created_at desc);
create index if not exists website_generation_runs_website_created_idx
  on public.website_generation_runs (website_id, created_at desc)
  where website_id is not null;

alter table public.website_generation_runs enable row level security;
revoke all on table public.website_generation_runs from public, anon, authenticated;
grant select, insert, update on table public.website_generation_runs to service_role;
