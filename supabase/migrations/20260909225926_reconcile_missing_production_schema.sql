-- Reconcile schema objects that exist in repository migrations but were not
-- applied to the current production database. Every statement is safe to run
-- again, and internal tables remain inaccessible to browser roles.

-- Unpublished customer drafts expire after seven days. Published websites are
-- deliberately excluded.
create extension if not exists pg_cron;

create index if not exists websites_unpublished_draft_created_at_idx
  on public.websites (created_at)
  where status = 'draft';

revoke delete on table public.websites from authenticated;

create or replace function public.delete_expired_website_drafts()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.websites
  where status = 'draft'
    and created_at < now() - interval '7 days';
end;
$$;

revoke all on function public.delete_expired_website_drafts()
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from cron.job
    where jobname = 'upvero_expire_unpublished_website_drafts'
  ) then
    perform cron.schedule(
      'upvero_expire_unpublished_website_drafts',
      '15 3 * * *',
      $cron$select public.delete_expired_website_drafts();$cron$
    );
  end if;
end;
$$;

-- Manual email-outreach tracking. This is an internal administrator table and
-- is intentionally unavailable to anon/authenticated Data API clients.
create table if not exists public.prospect_outreach_tracking (
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

create index if not exists prospect_outreach_tracking_created_by_idx
  on public.prospect_outreach_tracking(created_by, stage, updated_at desc);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'prospect_outreach_tracking_set_updated_at'
      and tgrelid = 'public.prospect_outreach_tracking'::regclass
  ) then
    execute $trigger$
      create trigger prospect_outreach_tracking_set_updated_at
      before update on public.prospect_outreach_tracking
      for each row execute procedure public.set_updated_at()
    $trigger$;
  end if;
end;
$$;

alter table public.prospect_outreach_tracking enable row level security;
revoke all on table public.prospect_outreach_tracking from anon, authenticated;
grant select, insert, update, delete on table public.prospect_outreach_tracking to service_role;

-- Contact inquiries submitted from a rendered customer website or private
-- prospect demo. Only the authenticated website owner may read website leads;
-- all inserts are performed by the validated server endpoint.
create table if not exists public.website_contact_leads (
  id uuid primary key default gen_random_uuid(),
  website_id uuid references public.websites(id) on delete cascade,
  prospect_demo_id uuid references public.prospect_demos(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  contact_method text not null check (char_length(trim(contact_method)) between 1 and 320),
  service text check (char_length(trim(service)) <= 160),
  notes text check (char_length(notes) <= 3000),
  created_at timestamptz not null default now(),
  constraint website_contact_leads_single_target check (
    num_nonnulls(website_id, prospect_demo_id) = 1
  )
);

create index if not exists website_contact_leads_website_created_idx
  on public.website_contact_leads(website_id, created_at desc)
  where website_id is not null;
create index if not exists website_contact_leads_prospect_demo_created_idx
  on public.website_contact_leads(prospect_demo_id, created_at desc)
  where prospect_demo_id is not null;

alter table public.website_contact_leads enable row level security;
revoke all on table public.website_contact_leads from anon, authenticated;
grant select on table public.website_contact_leads to authenticated;
grant select, insert, update, delete on table public.website_contact_leads to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'website_contact_leads'
      and policyname = 'Customers read leads for their own websites'
  ) then
    execute $policy$
      create policy "Customers read leads for their own websites"
      on public.website_contact_leads for select to authenticated
      using (
        website_id is not null
        and exists (
          select 1 from public.websites
          where websites.id = website_contact_leads.website_id
            and websites.owner_id = (select auth.uid())
        )
      )
    $policy$;
  end if;
end;
$$;

create table if not exists public.website_contact_lead_quota_windows (
  target_key text not null check (char_length(target_key) between 1 and 80),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (target_key, window_started_at)
);

alter table public.website_contact_lead_quota_windows enable row level security;
revoke all on table public.website_contact_lead_quota_windows from anon, authenticated;
grant select, insert, update, delete on table public.website_contact_lead_quota_windows to service_role;

create or replace function public.consume_website_contact_lead_quota(
  p_target_key text,
  p_limit integer default 12
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := date_trunc('hour', now());
begin
  if p_target_key is null or char_length(p_target_key) = 0 or char_length(p_target_key) > 80 then
    raise exception 'A valid contact target is required.' using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 100 then
    raise exception 'An invalid contact quota was requested.' using errcode = '22023';
  end if;

  insert into public.website_contact_lead_quota_windows (
    target_key, window_started_at, request_count
  ) values (p_target_key, v_window, 1)
  on conflict (target_key, window_started_at) do update
    set request_count = public.website_contact_lead_quota_windows.request_count + 1
    where public.website_contact_lead_quota_windows.request_count < p_limit;

  return found;
end;
$$;

revoke all on function public.consume_website_contact_lead_quota(text, integer)
  from public, anon, authenticated;
grant execute on function public.consume_website_contact_lead_quota(text, integer)
  to service_role;

-- Add source evidence, explicit consent state, and an immutable activity ledger
-- to manual SMS preparation. This does not send messages automatically.
alter table public.prospect_sms_drafts
  add column if not exists phone_source_url text,
  add column if not exists phone_confidence text not null default 'unverified' check (
    phone_confidence in ('high', 'medium', 'low', 'unverified')
  ),
  add column if not exists consent_status text not null default 'unknown' check (
    consent_status in ('unknown', 'opted_in', 'opted_out')
  ),
  add column if not exists consent_source text,
  add column if not exists consent_recorded_at timestamptz;

create table if not exists public.prospect_sms_events (
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

create index if not exists prospect_sms_events_draft_created_idx
  on public.prospect_sms_events(prospect_sms_draft_id, created_at desc);

alter table public.prospect_sms_events enable row level security;
revoke all on table public.prospect_sms_events from anon, authenticated;
grant select, insert, update, delete on table public.prospect_sms_events to service_role;

notify pgrst, 'reload schema';
