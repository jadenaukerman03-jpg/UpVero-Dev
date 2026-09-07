-- Source evidence and history for review-only SMS preparation. These additions
-- deliberately do not introduce an SMS provider, queue, or delivery endpoint.
alter table public.prospect_sms_drafts
  add column phone_source_url text,
  add column phone_confidence text not null default 'unverified' check (
    phone_confidence in ('high', 'medium', 'low', 'unverified')
  ),
  add column consent_status text not null default 'unknown' check (
    consent_status in ('unknown', 'opted_in', 'opted_out')
  ),
  add column consent_source text,
  add column consent_recorded_at timestamptz;

create table public.prospect_sms_events (
  id uuid primary key default gen_random_uuid(),
  prospect_sms_draft_id uuid not null references public.prospect_sms_drafts(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'draft_prepared',
      'draft_saved',
      'copied_for_manual_send',
      'consent_recorded',
      'marked_do_not_contact'
    )
  ),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index prospect_sms_events_draft_created_idx
  on public.prospect_sms_events(prospect_sms_draft_id, created_at desc);

alter table public.prospect_sms_events enable row level security;
revoke all on table public.prospect_sms_events from anon, authenticated;
