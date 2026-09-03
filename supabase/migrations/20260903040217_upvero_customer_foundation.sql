-- UpVero Phase 1: customer identity, website ownership, and billing foundations.
-- Every public table below is protected by RLS and least-privilege grants.

create type public.subscription_tier as enum ('launch', 'growth', 'professional');
create type public.website_status as enum ('draft', 'published', 'archived');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  industry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.websites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  status public.website_status not null default 'draft',
  site_config jsonb not null,
  customization jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  website_id uuid references public.websites (id) on delete set null,
  tier public.subscription_tier not null,
  status public.subscription_status not null default 'incomplete',
  provider text not null default 'stripe',
  provider_customer_id text unique,
  provider_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  website_id uuid references public.websites (id) on delete cascade,
  selected_tier public.subscription_tier not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_owner_id_idx on public.businesses (owner_id);
create index websites_owner_id_idx on public.websites (owner_id);
create index websites_business_id_idx on public.websites (business_id);
create index subscriptions_owner_id_idx on public.subscriptions (owner_id);
create index subscriptions_business_id_idx on public.subscriptions (business_id);
create index purchase_drafts_owner_id_idx on public.purchase_drafts (owner_id);

-- New Auth users get a matching customer profile. This is the only profile-insert path.
create function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  );
  return new;
end;
$$;

revoke all on function public.handle_new_customer() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_customer();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger businesses_set_updated_at before update on public.businesses for each row execute procedure public.set_updated_at();
create trigger websites_set_updated_at before update on public.websites for each row execute procedure public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute procedure public.set_updated_at();
create trigger purchase_drafts_set_updated_at before update on public.purchase_drafts for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.websites enable row level security;
alter table public.subscriptions enable row level security;
alter table public.purchase_drafts enable row level security;

revoke all on table public.profiles, public.businesses, public.websites, public.subscriptions, public.purchase_drafts from anon;
revoke all on table public.profiles, public.businesses, public.websites, public.subscriptions, public.purchase_drafts from authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.businesses to authenticated;
grant select, insert, update, delete on public.websites to authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.purchase_drafts to authenticated;

create policy "Customers read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "Customers update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Customers manage their own businesses"
on public.businesses for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Customers read their own websites"
on public.websites for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "Customers create websites for their own businesses"
on public.websites for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.businesses
    where businesses.id = websites.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "Customers update their own websites"
on public.websites for update to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.businesses
    where businesses.id = websites.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "Customers delete their own websites"
on public.websites for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy "Customers read their own subscriptions"
on public.subscriptions for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "Customers read their own purchase drafts"
on public.purchase_drafts for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "Customers create purchase drafts for their own websites"
on public.purchase_drafts for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and (
    website_id is null
    or exists (
      select 1 from public.websites
      where websites.id = purchase_drafts.website_id
        and websites.owner_id = (select auth.uid())
    )
  )
);

create policy "Customers update their own purchase drafts"
on public.purchase_drafts for update to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and (
    website_id is null
    or exists (
      select 1 from public.websites
      where websites.id = purchase_drafts.website_id
        and websites.owner_id = (select auth.uid())
    )
  )
);

create policy "Customers delete their own purchase drafts"
on public.purchase_drafts for delete to authenticated
using ((select auth.uid()) = owner_id);
