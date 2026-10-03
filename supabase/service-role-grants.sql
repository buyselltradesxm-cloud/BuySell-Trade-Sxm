-- Buy Sell Trade SXM -- table grants the Edge Functions need (2026-10-03)
-- Run once: supabase db query --linked --file supabase/service-role-grants.sql
--
-- The Edge Functions call the Data API with the service role. That role
-- bypasses RLS but still needs ordinary table privileges, and these were
-- missing on the live database (security-hardening-v2-grants.sql was never
-- fully applied, and push_subscriptions never had any):
--   stripe-webhook          payment_webhook_events  select, insert, update
--   request-password-reset  security_events         insert
--   admin-delete-user,
--   delete-my-account       admin_events            insert
--   send-push               push_subscriptions      select, delete
-- Exactly what each function uses, nothing broader.
begin;
grant select, insert, update on public.payment_webhook_events to service_role;
grant insert on public.security_events to service_role;
grant insert on public.admin_events to service_role;
grant select, delete on public.push_subscriptions to service_role;
commit;
