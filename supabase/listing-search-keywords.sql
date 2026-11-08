-- ============================================================
--  Buy Sell Trade Sxm — bilingual search keywords for every listing
--  Run once: supabase db query --linked -f supabase/listing-search-keywords.sql
--  Idempotent — safe to re-run.
--
--  WHY: a buyer who types "canapé" must find an English listing titled
--  "Caouche grise" (misspelled "couch"). A word list cannot know every word
--  or every spelling mistake, so when a listing is posted or its title /
--  description changes, the listing-keywords Edge Function asks Claude for
--  French + English search keywords (spelling fixed) and stores them in
--  listings.search_keywords. The site and the apps search that column too;
--  it is never shown.
--
--  Prereqs (already there for push notifications): vault secrets PROJECT_URL
--  and PUSH_FUNCTION_SECRET (the shared DB -> Edge Function secret), pg_net.
--  Then: supabase secrets set ANTHROPIC_API_KEY (scripts/setup-listing-keywords.ps1)
--        supabase functions deploy listing-keywords --no-verify-jwt
-- ============================================================

create extension if not exists pg_net with schema extensions;

alter table public.listings add column if not exists search_keywords text;
alter table public.listings drop constraint if exists listings_search_keywords_size;
alter table public.listings add constraint listings_search_keywords_size
  check (search_keywords is null or char_length(search_keywords) <= 1500);

-- Sellers must not write their own keywords (keyword stuffing): only the
-- service role (the Edge Function, auth.uid() is null) or an admin may set
-- them. A seller's edit of the title or description clears the stale ones;
-- the trigger below then asks for new ones.
create or replace function public.protect_listing_search_keywords()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.search_keywords := null;
  elsif new.title is distinct from old.title or new.description is distinct from old.description then
    new.search_keywords := null;
  else
    new.search_keywords := old.search_keywords;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_listing_search_keywords_trigger on public.listings;
create trigger protect_listing_search_keywords_trigger
  before insert or update on public.listings
  for each row execute function public.protect_listing_search_keywords();

-- Ask the Edge Function for one listing's keywords (asynchronous HTTP call
-- through pg_net: never slows down or breaks the insert / update).
create or replace function public.queue_listing_keywords(p_listing_id bigint)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  fn_url text;
  fn_secret text;
begin
  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'PROJECT_URL' limit 1;
  select decrypted_secret into fn_secret from vault.decrypted_secrets where name = 'PUSH_FUNCTION_SECRET' limit 1;
  if fn_url is null or fn_secret is null then
    return;  -- not configured: listings simply have no keywords
  end if;
  perform net.http_post(
    url := fn_url || '/functions/v1/listing-keywords',
    headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', fn_secret),
    body := jsonb_build_object('listing_id', p_listing_id)
  );
end;
$$;

create or replace function public.request_listing_keywords()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.seller_id is not null and (tg_op = 'INSERT'
      or new.title is distinct from old.title or new.description is distinct from old.description) then
    perform public.queue_listing_keywords(new.id);
  end if;
  return new;
exception when others then
  return new;  -- keywords are a nice-to-have: never roll back the listing
end;
$$;

drop trigger if exists request_listing_keywords_trigger on public.listings;
create trigger request_listing_keywords_trigger
  after insert or update of title, description on public.listings
  for each row execute function public.request_listing_keywords();

revoke execute on function public.queue_listing_keywords(bigint) from public, anon, authenticated;
revoke execute on function public.request_listing_keywords() from public, anon, authenticated;
revoke execute on function public.protect_listing_search_keywords() from public, anon, authenticated;

-- Self-check: the column, both triggers and the sizes guard exist.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'listings' and column_name = 'search_keywords') then
    raise exception 'listings.search_keywords missing';
  end if;
  if (select count(*) from pg_trigger where tgrelid = 'public.listings'::regclass
      and tgname in ('protect_listing_search_keywords_trigger', 'request_listing_keywords_trigger')) <> 2 then
    raise exception 'listing keyword triggers missing';
  end if;
end $$;

-- Backfill (run AFTER the function is deployed and ANTHROPIC_API_KEY is set):
--   select public.queue_listing_keywords(id) from public.listings
--    where search_keywords is null and seller_id is not null;
