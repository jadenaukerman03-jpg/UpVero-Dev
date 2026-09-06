-- Private website drafts are temporary. Published websites are deliberately
-- excluded so their records remain available for the life of the account.
create extension if not exists pg_cron;

create index if not exists websites_unpublished_draft_created_at_idx
  on public.websites (created_at)
  where status = 'draft';

-- Customer clients must not be able to delete a published website directly.
-- Draft deletion is performed by the authenticated server function after it
-- verifies ownership and draft status.
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

revoke all on function public.delete_expired_website_drafts() from public;

-- Make this migration safe to apply again without creating duplicate jobs.
select cron.unschedule(jobid)
from cron.job
where jobname = 'upvero_expire_unpublished_website_drafts';

select cron.schedule(
  'upvero_expire_unpublished_website_drafts',
  '15 3 * * *',
  $cron$select public.delete_expired_website_drafts();$cron$
);
