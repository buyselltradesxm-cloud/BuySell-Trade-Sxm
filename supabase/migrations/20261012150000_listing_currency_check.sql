-- ============================================================
--  Buy Sell Trade Sxm — a listing's currency is 'eur' or 'usd', nothing else
--  Run in: Supabase Dashboard > SQL Editor > New query > paste all > Run
--  Idempotent — safe to re-run.
--
--  WHY: listings.currency is free text, and a signed-in user writes their
--  own listings through the data API, not only through the site's form.
--  The site puts the currency into the price markup and compares it in
--  several places, so the column must only ever hold one of the two values
--  the app knows. The app already refuses anything else when it draws a
--  price; this stops a bad value from being stored at all.
--  NULL stays allowed: the app then uses the listing's side of the island.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'listings_currency_check'
      and conrelid = 'public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_currency_check check (currency in ('eur', 'usd'));
  end if;
end $$;
