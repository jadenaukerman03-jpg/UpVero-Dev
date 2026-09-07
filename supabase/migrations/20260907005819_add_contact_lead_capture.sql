-- Contact inquiries submitted from a rendered customer website or a private
-- prospect preview. The browser never receives direct table privileges: the
-- server resolves the public target, validates the submission, rate-limits it,
-- and performs the insert with its server-only client.
create table public.website_contact_leads (
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

create index website_contact_leads_website_created_idx
  on public.website_contact_leads(website_id, created_at desc)
  where website_id is not null;
create index website_contact_leads_prospect_demo_created_idx
  on public.website_contact_leads(prospect_demo_id, created_at desc)
  where prospect_demo_id is not null;

alter table public.website_contact_leads enable row level security;
revoke all on table public.website_contact_leads from anon, authenticated;

-- A website owner may read inquiries for their own website, but cannot create,
-- modify, or delete them through the Data API.
grant select on table public.website_contact_leads to authenticated;
create policy "Customers read leads for their own websites"
on public.website_contact_leads for select to authenticated
using (
  website_id is not null
  and exists (
    select 1 from public.websites
    where websites.id = website_contact_leads.website_id
      and websites.owner_id = (select auth.uid())
  )
);

-- Private, atomic per-target throttling. This function is intentionally
-- callable only by the server's service-role client; it is not a public RPC.
create table public.website_contact_lead_quota_windows (
  target_key text not null check (char_length(target_key) between 1 and 80),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (target_key, window_started_at)
);

alter table public.website_contact_lead_quota_windows enable row level security;
revoke all on table public.website_contact_lead_quota_windows from anon, authenticated;

create function public.consume_website_contact_lead_quota(
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
