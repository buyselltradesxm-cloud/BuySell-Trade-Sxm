-- Buy Sell Trade SXM -- Studio Pro listing details (2026-11-07)
-- Run once: supabase db query --linked --file supabase/pro-studio-details.sql
-- Idempotent. One transaction.
--
-- The Studio Pro form stores each activity's extra fields (opening hours,
-- weekly rate, bedrooms, menu, route prices...) as one JSON object per
-- listing. The app renders it escaped; these checks only bound the payload.
begin;

alter table public.listings add column if not exists details jsonb;

alter table public.listings
  drop constraint if exists listings_details_object,
  drop constraint if exists listings_details_size,
  drop constraint if exists listings_details_no_prototype_keys;
alter table public.listings
  add constraint listings_details_object check (details is null or jsonb_typeof(details) = 'object'),
  add constraint listings_details_size check (details is null or octet_length(details::text) <= 32768),
  add constraint listings_details_no_prototype_keys check (
    details is null or details::text !~ '"(__proto__|prototype|constructor)"'
  );

commit;
