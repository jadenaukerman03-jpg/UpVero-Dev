-- Private, administrator-operated registry pipeline. These records are never
-- exposed through the browser Data API; server functions verify the admin
-- allowlist before using the service-role client.
create table public.business_registries (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  source_name text not null check (char_length(trim(source_name)) between 1 and 255),
  target_industry text not null default 'roofing' check (char_length(trim(target_industry)) between 1 and 160),
  source_headers jsonb not null default '[]'::jsonb,
  column_mapping jsonb not null default '{}'::jsonb,
  status text not null default 'importing' check (status in ('importing', 'complete', 'failed')),
  row_count integer not null default 0 check (row_count >= 0),
  imported_count integer not null default 0 check (imported_count >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.registry_businesses (
  id uuid primary key default gen_random_uuid(),
  registry_id uuid not null references public.business_registries(id) on delete cascade,
  dedupe_key text not null unique,
  name text not null check (char_length(trim(name)) between 1 and 300),
  entity_type text,
  registration_date date,
  registration_status text,
  registered_address text,
  city text,
  state text,
  zip_code text,
  owner_or_agent text,
  industry text,
  website_url text,
  raw_row jsonb not null default '{}'::jsonb,
  preliminary_score integer not null check (preliminary_score between 0 and 100),
  preliminary_reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registry_candidates (
  id uuid primary key default gen_random_uuid(),
  registry_business_id uuid not null unique references public.registry_businesses(id) on delete cascade,
  review_status text not null default 'review' check (
    review_status in ('review', 'research_queued', 'researching', 'research_complete', 'research_failed', 'demo_queued', 'demo_complete', 'dismissed')
  ),
  research_result jsonb,
  research_source_count integer not null default 0 check (research_source_count >= 0),
  research_attempts integer not null default 0 check (research_attempts >= 0),
  last_research_error text,
  demo_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_registries_created_by_idx on public.business_registries(created_by, created_at desc);
create index registry_businesses_registry_score_idx on public.registry_businesses(registry_id, preliminary_score desc);
create index registry_businesses_industry_idx on public.registry_businesses(industry);
create index registry_candidates_status_idx on public.registry_candidates(review_status, created_at desc);

create trigger registry_businesses_set_updated_at
before update on public.registry_businesses
for each row execute procedure public.set_updated_at();

create trigger registry_candidates_set_updated_at
before update on public.registry_candidates
for each row execute procedure public.set_updated_at();

alter table public.business_registries enable row level security;
alter table public.registry_businesses enable row level security;
alter table public.registry_candidates enable row level security;

revoke all on table public.business_registries, public.registry_businesses, public.registry_candidates from anon, authenticated;
