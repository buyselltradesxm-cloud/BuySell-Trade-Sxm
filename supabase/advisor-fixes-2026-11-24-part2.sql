-- ============================================================
--  Buy Sell Trade Sxm — Supabase Advisor fixes, part 2 (2026-11-24)
--  Run AFTER advisor-fixes-2026-11-24.sql. One transaction.
--
--  1. multiple_permissive_policies: each "admin … tout" FOR ALL policy is
--     folded into the per-action policies (permissive policies are OR'ed,
--     so "own OR is_admin()" in one policy = the two policies before).
--     Who can read/write what does not change.
--  2. rls_enabled_no_policy: server-only tables get an explicit
--     "no client access" policy. RLS with no policy already denied
--     everything to anon/authenticated; this only says it out loud.
--     service_role and SECURITY DEFINER functions are unaffected.
-- ============================================================
begin;

-- ad_campaigns / admin_settings: everyone reads, only admins write.
drop policy if exists "ad_campaigns: admin gere tout" on public.ad_campaigns;
drop policy if exists "ad_campaigns: admin ajoute" on public.ad_campaigns;
drop policy if exists "ad_campaigns: admin modifie" on public.ad_campaigns;
drop policy if exists "ad_campaigns: admin supprime" on public.ad_campaigns;
create policy "ad_campaigns: admin ajoute" on public.ad_campaigns for insert to authenticated with check (is_admin());
create policy "ad_campaigns: admin modifie" on public.ad_campaigns for update to authenticated using (is_admin()) with check (is_admin());
create policy "ad_campaigns: admin supprime" on public.ad_campaigns for delete to authenticated using (is_admin());

drop policy if exists "admin_settings: admin gère tout" on public.admin_settings;
drop policy if exists "admin_settings: admin ajoute" on public.admin_settings;
drop policy if exists "admin_settings: admin modifie" on public.admin_settings;
drop policy if exists "admin_settings: admin supprime" on public.admin_settings;
create policy "admin_settings: admin ajoute" on public.admin_settings for insert to authenticated with check (is_admin());
create policy "admin_settings: admin modifie" on public.admin_settings for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin_settings: admin supprime" on public.admin_settings for delete to authenticated using (is_admin());

-- listings: "lecture publique" already includes is_admin(); fold admin into insert/update/delete.
-- The RESTRICTIVE "console publication gate" is untouched (it applied to admins before too).
drop policy if exists "listings: admin modère tout" on public.listings;
alter policy "listings: créer la sienne (connecté)" on public.listings
  with check ((((select auth.uid()) = seller_id) and (not is_banned())) or is_admin());
alter policy "listings: modifier la sienne" on public.listings
  using ((((select auth.uid()) = seller_id) and (not is_banned())) or is_admin())
  with check ((((select auth.uid()) = seller_id) and (not is_banned())) or is_admin());
alter policy "listings: supprimer la sienne" on public.listings
  using ((((select auth.uid()) = seller_id) and (not is_banned())) or is_admin());

-- profiles: "lecture privee" (own OR admin) is covered by the merged policy.
drop policy if exists "profiles: admin gère tout" on public.profiles;
drop policy if exists "profiles: lecture privee" on public.profiles;
alter policy "profiles: chacun gère le sien" on public.profiles
  using (((select auth.uid()) = id) or is_admin())
  with check (((select auth.uid()) = id) or is_admin());

-- reports: users file their own, admins read and manage all.
drop policy if exists "reports: admin lit et gère" on public.reports;
drop policy if exists "reports: admin lit" on public.reports;
drop policy if exists "reports: admin modifie" on public.reports;
drop policy if exists "reports: admin supprime" on public.reports;
alter policy "reports: créer connecté" on public.reports
  with check ((((select auth.uid()) = reporter_id) and (not is_banned())) or is_admin());
create policy "reports: admin lit" on public.reports for select to authenticated using (is_admin());
create policy "reports: admin modifie" on public.reports for update to authenticated using (is_admin()) with check (is_admin());
create policy "reports: admin supprime" on public.reports for delete to authenticated using (is_admin());

-- Server-only tables: explicit deny for app users.
do $$
declare t text;
begin
  foreach t in array array[
    'apple_purchase_intents','apple_purchase_rate_limits','apple_transactions','client_errors',
    'google_play_purchase_rate_limits','listing_creations','payment_webhook_events','paypal_webhook_events',
    'pro_trial_claims','search_digest_jobs','search_digest_preferences','search_digest_reservations',
    'search_digest_seen','search_digest_settings','security_events','security_rate_limits',
    'site_daily_stats','stripe_boost_purchases']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "no client access" on public.%I', t);
      execute format('create policy "no client access" on public.%I for all to anon, authenticated using (false) with check (false)', t);
    end if;
  end loop;
end $$;

commit;
