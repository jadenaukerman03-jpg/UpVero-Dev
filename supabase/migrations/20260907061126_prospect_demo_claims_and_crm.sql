-- A private-preview recipient may claim one demo through an expiring,
-- high-entropy token. Claiming is performed only by a verified server
-- function after Supabase Auth identifies the account.
alter table public.prospect_demos
  add column claim_token uuid not null default gen_random_uuid() unique,
  add column claim_expires_at timestamptz,
  add column claimed_by uuid references public.profiles(id) on delete set null,
  add column claimed_at timestamptz,
  add column claimed_website_id uuid references public.websites(id) on delete set null;

create index prospect_demos_claim_token_idx on public.prospect_demos(claim_token);
create index prospect_demos_claimed_by_idx on public.prospect_demos(claimed_by, claimed_at desc)
  where claimed_by is not null;

-- Private CRM records are never exposed to the browser Data API. The admin
-- server functions verify the allowlist and registry ownership before access.
create table public.prospect_crm_records (
  id uuid primary key default gen_random_uuid(),
  prospect_demo_id uuid not null unique references public.prospect_demos(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  stage text not null default 'demo_ready' check (
    stage in ('demo_ready', 'contacted', 'replied', 'meeting', 'proposal', 'won', 'lost', 'do_not_contact')
  ),
  next_follow_up_at timestamptz,
  notes text not null default '' check (char_length(notes) <= 4000),
  last_contacted_at timestamptz,
  replied_at timestamptz,
  won_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prospect_crm_events (
  id uuid primary key default gen_random_uuid(),
  prospect_crm_record_id uuid not null references public.prospect_crm_records(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('record_created', 'stage_changed', 'follow_up_scheduled', 'note_saved', 'demo_claimed')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index prospect_crm_records_owner_stage_idx
  on public.prospect_crm_records(created_by, stage, updated_at desc);
create index prospect_crm_records_follow_up_idx
  on public.prospect_crm_records(created_by, next_follow_up_at)
  where next_follow_up_at is not null;
create index prospect_crm_events_record_created_idx
  on public.prospect_crm_events(prospect_crm_record_id, created_at desc);

create trigger prospect_crm_records_set_updated_at
before update on public.prospect_crm_records
for each row execute procedure public.set_updated_at();

alter table public.prospect_crm_records enable row level security;
alter table public.prospect_crm_events enable row level security;
revoke all on table public.prospect_crm_records, public.prospect_crm_events from anon, authenticated;
