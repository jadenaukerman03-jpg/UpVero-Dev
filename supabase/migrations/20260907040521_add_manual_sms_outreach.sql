-- Administrator-reviewed SMS preparation only. Upvero never sends messages
-- through an SMS provider from this workflow.
create table public.prospect_sms_drafts (
  id uuid primary key default gen_random_uuid(),
  prospect_demo_id uuid not null unique references public.prospect_demos(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  recipient_phone text,
  recipient_phone_normalized text check (
    recipient_phone_normalized is null
    or recipient_phone_normalized ~ '^\+[1-9][0-9]{7,14}$'
  ),
  body text not null check (char_length(trim(body)) between 1 and 1600),
  stage text not null default 'ready' check (
    stage in ('ready', 'contacted', 'replied', 'meeting', 'won', 'lost', 'do_not_contact')
  ),
  notes text not null default '' check (char_length(notes) <= 2000),
  last_contacted_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prospect_sms_drafts_created_by_idx
  on public.prospect_sms_drafts(created_by, stage, updated_at desc);

create index prospect_sms_drafts_recipient_phone_idx
  on public.prospect_sms_drafts(recipient_phone_normalized)
  where recipient_phone_normalized is not null;

create trigger prospect_sms_drafts_set_updated_at
before update on public.prospect_sms_drafts
for each row execute procedure public.set_updated_at();

alter table public.prospect_sms_drafts enable row level security;
revoke all on table public.prospect_sms_drafts from anon, authenticated;

-- A number marked do-not-contact is intentionally shared across all future
-- prospect SMS drafts, preventing a later import from reintroducing it.
create table public.prospect_sms_suppressions (
  recipient_phone_normalized text primary key check (
    recipient_phone_normalized ~ '^\+[1-9][0-9]{7,14}$'
  ),
  created_by uuid not null references public.profiles(id) on delete cascade,
  source_draft_id uuid references public.prospect_sms_drafts(id) on delete set null,
  reason text not null default 'Manual do-not-contact request' check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.prospect_sms_suppressions enable row level security;
revoke all on table public.prospect_sms_suppressions from anon, authenticated;
