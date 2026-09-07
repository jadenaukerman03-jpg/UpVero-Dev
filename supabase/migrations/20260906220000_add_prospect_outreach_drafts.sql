-- Copy-ready, administrator-owned outreach preparation. These drafts never
-- send email or SMS; they are only stored for manual review and copying.
create table public.prospect_outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  prospect_demo_id uuid not null unique references public.prospect_demos(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  recipient_email text,
  subject text not null check (char_length(trim(subject)) between 1 and 240),
  body text not null check (char_length(trim(body)) between 1 and 6000),
  status text not null default 'draft' check (status in ('draft', 'ready_to_copy', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prospect_outreach_drafts_created_by_idx
  on public.prospect_outreach_drafts(created_by, updated_at desc);

create trigger prospect_outreach_drafts_set_updated_at
before update on public.prospect_outreach_drafts
for each row execute procedure public.set_updated_at();

alter table public.prospect_outreach_drafts enable row level security;
revoke all on table public.prospect_outreach_drafts from anon, authenticated;
