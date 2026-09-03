-- Durable, server-enforced quotas for operations that can consume third-party API credits.
create table public.provider_operation_quota_windows (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  operation text not null check (operation in ('business_research', 'ai_generation', 'image_sourcing')),
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (owner_id, operation, window_started_at)
);

alter table public.provider_operation_quota_windows enable row level security;
revoke all on table public.provider_operation_quota_windows from anon, authenticated;

create function public.consume_provider_operation_quota(p_operation text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_owner_id uuid := auth.uid();
  v_limit integer;
  v_window_seconds integer := 3600;
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if v_owner_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  case p_operation
    when 'business_research' then v_limit := 10;
    when 'ai_generation' then v_limit := 5;
    when 'image_sourcing' then v_limit := 10;
    else raise exception 'Unsupported provider operation.' using errcode = '22023';
  end case;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from now()) / v_window_seconds) * v_window_seconds
  );

  insert into public.provider_operation_quota_windows (
    owner_id, operation, window_started_at, request_count
  )
  values (v_owner_id, p_operation, v_window_started_at, 1)
  on conflict (owner_id, operation, window_started_at)
  do update set request_count = public.provider_operation_quota_windows.request_count + 1
  returning request_count into v_request_count;

  return v_request_count <= v_limit;
end;
$$;

revoke all on function public.consume_provider_operation_quota(text) from public, anon;
grant execute on function public.consume_provider_operation_quota(text) to authenticated;
