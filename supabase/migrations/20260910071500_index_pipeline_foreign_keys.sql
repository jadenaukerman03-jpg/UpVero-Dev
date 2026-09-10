-- Keep registry, demo, CRM, SMS, and generation cleanup/join operations fast
-- as the admin pipeline grows. These indexes do not change data or access.
create index if not exists prospect_crm_events_created_by_idx
  on public.prospect_crm_events (created_by);

create index if not exists prospect_demos_claimed_website_id_idx
  on public.prospect_demos (claimed_website_id)
  where claimed_website_id is not null;

create index if not exists prospect_demos_created_by_idx
  on public.prospect_demos (created_by);

create index if not exists prospect_sms_events_created_by_idx
  on public.prospect_sms_events (created_by);

create index if not exists prospect_sms_suppressions_created_by_idx
  on public.prospect_sms_suppressions (created_by);

create index if not exists prospect_sms_suppressions_source_draft_id_idx
  on public.prospect_sms_suppressions (source_draft_id)
  where source_draft_id is not null;

create index if not exists registry_processing_jobs_created_by_idx
  on public.registry_processing_jobs (created_by);

create index if not exists registry_processing_jobs_registry_id_idx
  on public.registry_processing_jobs (registry_id);

create index if not exists website_generation_runs_business_id_idx
  on public.website_generation_runs (business_id)
  where business_id is not null;
