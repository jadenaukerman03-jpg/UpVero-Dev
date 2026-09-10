-- Keep the server-only public form quota tables bounded. The active window is
-- hourly, so retaining 48 hours is sufficient for throttling and diagnostics.
create index if not exists support_contact_message_quota_window_started_idx
  on public.support_contact_message_quota_windows(window_started_at);

create index if not exists website_contact_lead_quota_window_started_idx
  on public.website_contact_lead_quota_windows(window_started_at);

create or replace function public.consume_support_contact_message_quota(
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

  delete from public.support_contact_message_quota_windows
  where window_started_at < v_window - interval '48 hours';

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

  delete from public.website_contact_lead_quota_windows
  where window_started_at < v_window - interval '48 hours';

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
