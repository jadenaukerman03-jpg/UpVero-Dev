-- Claiming a private demo previously required several independent server
-- mutations. A failure after reserving the demo could leave a claimed demo
-- without a linked website, or create orphaned business/website rows. Keep the
-- complete state transition under one row lock and one PostgreSQL transaction.
create or replace function public.claim_private_prospect_demo(
  p_preview_token uuid,
  p_claim_token uuid,
  p_presentation_overrides jsonb default null
)
returns table (
  website_id uuid,
  already_claimed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_demo record;
  v_site_config jsonb;
  v_business_id uuid;
  v_website_id uuid;
  v_crm_id uuid;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Sign in is required to claim this private preview.'
      using errcode = '42501';
  end if;

  if p_preview_token is null or p_claim_token is null then
    raise exception 'This private preview is unavailable for claiming.'
      using errcode = 'P0002';
  end if;

  if p_presentation_overrides is not null then
    if jsonb_typeof(p_presentation_overrides) <> 'object'
      or octet_length(p_presentation_overrides::text) > 50000
      or exists (
        select 1
        from jsonb_object_keys(p_presentation_overrides) as supplied(key)
        where supplied.key not in (
          'visualDirection',
          'themeId',
          'fontId',
          'sectionStyles',
          'imageAssignments'
        )
      )
    then
      raise exception 'The preview customization is invalid.'
        using errcode = '22023';
    end if;
  end if;

  select
    demo.id,
    demo.created_by,
    demo.site_config,
    demo.expires_at,
    demo.claim_expires_at,
    demo.claimed_by,
    demo.claimed_website_id,
    business.name as business_name,
    business.industry as business_industry
  into v_demo
  from public.prospect_demos as demo
  join public.registry_candidates as candidate
    on candidate.id = demo.registry_candidate_id
  join public.registry_businesses as business
    on business.id = candidate.registry_business_id
  where demo.preview_token = p_preview_token
    and demo.claim_token = p_claim_token
    and demo.status = 'ready'
  for update of demo;

  if not found
    or (v_demo.expires_at is not null and v_demo.expires_at <= v_now)
    or (v_demo.claim_expires_at is not null and v_demo.claim_expires_at <= v_now)
  then
    raise exception 'This private preview is unavailable for claiming.'
      using errcode = 'P0002';
  end if;

  if v_demo.claimed_by is not null then
    if v_demo.claimed_by = v_user_id and v_demo.claimed_website_id is not null then
      website_id := v_demo.claimed_website_id;
      already_claimed := true;
      return next;
      return;
    end if;

    if v_demo.claimed_by <> v_user_id then
      raise exception 'This private preview has already been claimed.'
        using errcode = '23505';
    end if;
  end if;

  if jsonb_typeof(v_demo.site_config) <> 'object'
    or nullif(trim(v_demo.business_name), '') is null
  then
    raise exception 'This private preview cannot be converted into a website draft.'
      using errcode = '22023';
  end if;

  v_site_config := case
    when p_presentation_overrides is null then v_demo.site_config
    else jsonb_set(
      v_demo.site_config,
      '{presentationOverrides}',
      p_presentation_overrides,
      true
    )
  end;

  insert into public.businesses (owner_id, name, industry)
  values (v_user_id, v_demo.business_name, v_demo.business_industry)
  returning id into v_business_id;

  insert into public.websites (owner_id, business_id, name, site_config)
  values (v_user_id, v_business_id, v_demo.business_name, v_site_config)
  returning id into v_website_id;

  insert into public.prospect_crm_records (
    prospect_demo_id,
    created_by,
    stage,
    replied_at
  )
  values (
    v_demo.id,
    v_demo.created_by,
    'replied',
    v_now
  )
  on conflict (prospect_demo_id) do update
    set stage = 'replied',
        replied_at = excluded.replied_at
  returning id into v_crm_id;

  update public.prospect_demos
  set claimed_by = v_user_id,
      claimed_at = v_now,
      claimed_website_id = v_website_id
  where id = v_demo.id;

  insert into public.prospect_crm_events (
    prospect_crm_record_id,
    created_by,
    event_type,
    details
  )
  values (
    v_crm_id,
    v_user_id,
    'demo_claimed',
    jsonb_build_object('websiteId', v_website_id)
  );

  website_id := v_website_id;
  already_claimed := false;
  return next;
end;
$$;

revoke all on function public.claim_private_prospect_demo(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.claim_private_prospect_demo(uuid, uuid, jsonb)
  to authenticated;

notify pgrst, 'reload schema';
