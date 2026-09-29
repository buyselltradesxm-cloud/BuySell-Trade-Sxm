-- Buy Sell Trade SXM -- security hardening v2, grants fix
-- Run once if security-hardening-v2.sql was applied before it included these
-- grants (2026-09-29). Idempotent:
--   supabase db query --linked --file supabase/security-hardening-v2-grants.sql
-- Without them, request-password-reset cannot log security events and
-- stripe-webhook cannot record or deduplicate Stripe events.
grant insert on public.security_events to service_role;
grant select, insert, update on public.payment_webhook_events to service_role;
