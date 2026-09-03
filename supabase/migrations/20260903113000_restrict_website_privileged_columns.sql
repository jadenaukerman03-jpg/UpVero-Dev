-- Customers may own website content, but publication state and paid-editor
-- controls are server-managed.  RLS controls rows; these grants control which
-- fields a browser session can write through the Supabase Data API.
revoke insert, update on table public.websites from authenticated;

-- A customer may create a draft only. `status` and `customization` use their
-- safe database defaults and cannot be supplied through the browser API.
grant insert (owner_id, business_id, name, site_config)
on table public.websites to authenticated;

-- Content remains editable while publication and entitlement-controlled
-- customization are restricted to verified server-side operations.
grant update (name, site_config)
on table public.websites to authenticated;
