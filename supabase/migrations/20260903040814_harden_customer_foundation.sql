-- Fix explicit function grants inherited from project defaults and index every FK.
revoke all on function public.handle_new_customer() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

create index subscriptions_website_id_idx on public.subscriptions (website_id);
create index purchase_drafts_website_id_idx on public.purchase_drafts (website_id);
