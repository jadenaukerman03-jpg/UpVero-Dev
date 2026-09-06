-- The admin allowlist is intentionally empty. Provision administrators only
-- through a deliberate privileged Supabase SQL process, never through the app.
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;

-- A signed-in user may only determine whether their own account is allowlisted.
create policy "Users may read only their own admin allowlist row"
on public.admin_users
for select
to authenticated
using ((select auth.uid()) = user_id);
