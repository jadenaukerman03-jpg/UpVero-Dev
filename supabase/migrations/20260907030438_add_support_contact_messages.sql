-- Public Upvero support messages are accepted only through a server function.
-- The Data API grants no browser access to these messages or their quota data.
create table public.support_contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text check (char_length(trim(name)) between 1 and 160),
  email text not null check (char_length(trim(email)) between 3 and 320),
  message text not null check (char_length(trim(message)) between 1 and 3000),
  created_at timestamptz not null default now()
);

create index support_contact_messages_created_idx
  on public.support_contact_messages(created_at desc);

alter table public.support_contact_messages enable row level security;
revoke all on table public.support_contact_messages from anon, authenticated;

create table public.support_contact_message_quota_windows (
  target_key text not null check (char_length(target_key) between 1 and 80),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (target_key, window_started_at)
);

alter table public.support_contact_message_quota_windows enable row level security;
revoke all on table public.support_contact_message_quota_windows from anon, authenticated;

create function public.consume_support_contact_message_quota(
  p_target_key text,
  p_limit integer default 30
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
    raise exception 'A valid message target is required.' using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 100 then
    raise exception 'An invalid message quota was requested.' using errcode = '22023';
  end if;

  insert into public.support_contact_message_quota_windows (
    target_key, window_started_at, request_count
  ) values (p_target_key, v_window, 1)
  on conflict (target_key, window_started_at) do update
    set request_count = public.support_contact_message_quota_windows.request_count + 1
    where public.support_contact_message_quota_windows.request_count < p_limit;

  return found;
end;
$$;

revoke all on function public.consume_support_contact_message_quota(text, integer)
  from public, anon, authenticated;
grant execute on function public.consume_support_contact_message_quota(text, integer)
  to service_role;
