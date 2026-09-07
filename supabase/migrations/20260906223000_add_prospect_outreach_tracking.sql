-- Manual sales-pipeline tracking for prepared prospect messages. This table
-- records an administrator's own actions; it has no delivery integration.
create table public.prospect_outreach_tracking (
  id uuid primary key default gen_random_uuid(),
  outreach_draft_id uuid not null unique references public.prospect_outreach_drafts(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  stage text not null default 'ready' check (
    stage in ('ready', 'contacted', 'replied', 'meeting', 'won', 'lost', 'do_not_contact')
  ),
  notes text not null default '' check (char_length(notes) <= 2000),
  last_contacted_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prospect_outreach_tracking_created_by_idx
  on public.prospect_outreach_tracking(created_by, stage, updated_at desc);

create trigger prospect_outreach_tracking_set_updated_at
before update on public.prospect_outreach_tracking
for each row execute procedure public.set_updated_at();

alter table public.prospect_outreach_tracking enable row level security;
revoke all on table public.prospect_outreach_tracking from anon, authenticated;
