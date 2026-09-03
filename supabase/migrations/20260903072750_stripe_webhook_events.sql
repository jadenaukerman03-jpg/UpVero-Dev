-- Stripe webhooks are processed server-side only. Customers never read or write events.
create table public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  processing_status text not null default 'processing'
    check (processing_status in ('processing', 'processed', 'failed')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stripe_webhook_events_status_idx
  on public.stripe_webhook_events (processing_status, created_at);
create index stripe_webhook_events_subscription_idx
  on public.stripe_webhook_events (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- A Stripe Customer can legitimately own subscriptions for multiple websites.
alter table public.subscriptions
  drop constraint subscriptions_provider_customer_id_key;
create index subscriptions_provider_customer_id_idx
  on public.subscriptions (provider_customer_id)
  where provider_customer_id is not null;

alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from anon, authenticated;

create trigger stripe_webhook_events_set_updated_at
  before update on public.stripe_webhook_events
  for each row execute procedure public.set_updated_at();
