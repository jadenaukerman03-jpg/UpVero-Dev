-- Durable, service-only queue for bounded administrative registry work.
create table public.registry_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  registry_id uuid not null references public.business_registries(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  job_type text not null check (job_type in ('research', 'demo_generation')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'canceled')),
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  attempts integer not null default 0 check (attempts between 0 and 25),
  locked_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table public.admin_provider_usage_daily (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  operation text not null check (operation in ('business_research', 'ai_generation', 'image_sourcing')),
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (owner_id, operation, usage_date)
);

create index registry_processing_jobs_claim_idx
  on public.registry_processing_jobs(status, job_type, created_at)
  where status in ('queued', 'running');

alter table public.registry_processing_jobs enable row level security;
alter table public.admin_provider_usage_daily enable row level security;
revoke all on table public.registry_processing_jobs, public.admin_provider_usage_daily from anon, authenticated;

-- Claiming is atomic so two browser sessions/workers cannot execute one job at
-- the same time. The lock expires after ten minutes to make interrupted jobs
-- recoverable. This function is service-role only.
create or replace function public.claim_next_registry_job(
  p_owner_id uuid,
  p_job_type text,
  p_lock_seconds integer default 600
)
returns public.registry_processing_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.registry_processing_jobs;
begin
  select * into v_job
  from public.registry_processing_jobs
  where created_by = p_owner_id
    and job_type = p_job_type
    and (
      status = 'queued'
      or (status = 'running' and locked_until < now() and attempts < 25)
    )
  order by created_at
  for update skip locked
  limit 1;

  if not found then return null; end if;

  update public.registry_processing_jobs
  set status = 'running',
      attempts = v_job.attempts + 1,
      started_at = coalesce(v_job.started_at, now()),
      locked_until = now() + make_interval(secs => greatest(60, least(p_lock_seconds, 900))),
      last_error = null
  where id = v_job.id
  returning * into v_job;

  return v_job;
end;
$$;

create or replace function public.consume_admin_provider_daily_budget(
  p_owner_id uuid,
  p_operation text,
  p_daily_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_daily_limit < 1 or p_daily_limit > 500 then return false; end if;
  insert into public.admin_provider_usage_daily(owner_id, operation, usage_date, request_count)
  values (p_owner_id, p_operation, current_date, 1)
  on conflict (owner_id, operation, usage_date)
  do update set request_count = public.admin_provider_usage_daily.request_count + 1
  returning request_count into v_count;
  return v_count <= p_daily_limit;
end;
$$;

revoke all on function public.claim_next_registry_job(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.consume_admin_provider_daily_budget(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.claim_next_registry_job(uuid, text, integer) to service_role;
grant execute on function public.consume_admin_provider_daily_budget(uuid, text, integer) to service_role;
