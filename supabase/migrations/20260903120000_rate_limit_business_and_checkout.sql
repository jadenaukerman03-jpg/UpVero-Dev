-- Extend the existing server-only, atomic quota function to protect operations
-- that do not call an AI provider but can still be abused or create costs.
create or replace function public.consume_provider_operation_quota(
  p_owner_id uuid,
  p_operation text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_window_seconds integer := 3600;
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_owner_id is null then raise exception 'A quota owner is required.' using errcode = '22004'; end if;
  case p_operation
    when 'business_research' then v_limit := 10;
    when 'ai_generation' then v_limit := 5;
    when 'image_sourcing' then v_limit := 10;
    when 'business_creation' then v_limit := 12;
    when 'checkout_creation' then v_limit := 6;
    else raise exception 'Unsupported operation.' using errcode = '22023';
  end case;
  v_window_started_at := to_timestamp(floor(extract(epoch from now()) / v_window_seconds) * v_window_seconds);
  insert into public.provider_operation_quota_windows (owner_id, operation, window_started_at, request_count)
  values (p_owner_id, p_operation, v_window_started_at, 1)
  on conflict (owner_id, operation, window_started_at)
  do update set request_count = public.provider_operation_quota_windows.request_count + 1
  returning request_count into v_request_count;
  return v_request_count <= v_limit;
end;
$$;
revoke all on function public.consume_provider_operation_quota(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_provider_operation_quota(uuid, text) to service_role;
