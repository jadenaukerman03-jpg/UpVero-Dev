-- Auditable artifacts for the V3 staged website-generation pipeline.
-- All tables are server-only; browser roles receive no grants or policies.

create table if not exists public.website_generation_stages (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.website_generation_runs (id) on delete cascade,
  stage_name text not null check (stage_name in (
    'research',
    'strategy',
    'information-architecture',
    'art-direction',
    'copy',
    'layout-composition',
    'image-selection',
    'specification-validation',
    'technical-qa',
    'visual-evaluation',
    'repair'
  )),
  attempt integer not null default 1 check (attempt between 1 and 4),
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  input_hash text,
  output_hash text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_cents numeric(10, 4) not null default 0 check (estimated_cost_cents >= 0),
  model text,
  error_code text,
  error_summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (run_id, stage_name, attempt)
);

create table if not exists public.website_generation_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.website_generation_runs (id) on delete cascade,
  stage_id uuid references public.website_generation_stages (id) on delete cascade,
  artifact_type text not null check (artifact_type in (
    'research-packet',
    'strategy',
    'architecture',
    'design-system',
    'copy-deck',
    'composition',
    'media-plan',
    'site-spec',
    'technical-report',
    'visual-report',
    'repair-patch'
  )),
  schema_version integer not null default 3 check (schema_version > 0),
  content jsonb not null,
  content_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.website_generation_defects (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.website_generation_runs (id) on delete cascade,
  artifact_id uuid references public.website_generation_artifacts (id) on delete set null,
  category text not null check (category in (
    'factual-accuracy',
    'contrast',
    'accessibility',
    'responsive-layout',
    'image',
    'copy',
    'originality',
    'conversion',
    'technical'
  )),
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  page_id text,
  section_id text,
  message text not null,
  status text not null default 'open' check (status in ('open', 'repaired', 'accepted')),
  repair_iteration integer not null default 0 check (repair_iteration between 0 and 3),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.website_generation_fingerprints (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.website_generation_runs (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  fingerprint text not null,
  characteristics jsonb not null default '{}'::jsonb,
  quality_score integer check (quality_score between 0 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.website_generation_preferences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  website_id uuid references public.websites (id) on delete cascade,
  preference_type text not null check (preference_type in (
    'approved-direction', 'rejected-pattern', 'user-edit', 'quality-outcome'
  )),
  preference jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists website_generation_stages_run_created_idx
  on public.website_generation_stages (run_id, created_at);
create index if not exists website_generation_artifacts_run_created_idx
  on public.website_generation_artifacts (run_id, created_at);
create index if not exists website_generation_artifacts_stage_id_idx
  on public.website_generation_artifacts (stage_id)
  where stage_id is not null;
create index if not exists website_generation_defects_run_status_idx
  on public.website_generation_defects (run_id, status);
create index if not exists website_generation_defects_artifact_id_idx
  on public.website_generation_defects (artifact_id)
  where artifact_id is not null;
create index if not exists website_generation_fingerprints_owner_created_idx
  on public.website_generation_fingerprints (owner_id, created_at desc);
create index if not exists website_generation_preferences_owner_created_idx
  on public.website_generation_preferences (owner_id, created_at desc);
create index if not exists website_generation_preferences_website_id_idx
  on public.website_generation_preferences (website_id)
  where website_id is not null;

alter table public.website_generation_stages enable row level security;
alter table public.website_generation_artifacts enable row level security;
alter table public.website_generation_defects enable row level security;
alter table public.website_generation_fingerprints enable row level security;
alter table public.website_generation_preferences enable row level security;

revoke all on table public.website_generation_stages from public, anon, authenticated;
revoke all on table public.website_generation_artifacts from public, anon, authenticated;
revoke all on table public.website_generation_defects from public, anon, authenticated;
revoke all on table public.website_generation_fingerprints from public, anon, authenticated;
revoke all on table public.website_generation_preferences from public, anon, authenticated;

grant select, insert, update on table public.website_generation_stages to service_role;
grant select, insert on table public.website_generation_artifacts to service_role;
grant select, insert, update on table public.website_generation_defects to service_role;
grant select, insert, update on table public.website_generation_fingerprints to service_role;
grant select, insert, update, delete on table public.website_generation_preferences to service_role;
