-- Defense in depth: Stripe event records are private to the server-side webhook.
create policy "No customer access to Stripe webhook events"
on public.stripe_webhook_events for all to anon, authenticated
using (false)
with check (false);
