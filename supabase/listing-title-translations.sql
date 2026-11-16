-- Preserve seller titles; generate FR/EN display titles through listing-keywords.
begin;
alter table public.listings add column if not exists title_fr text;
alter table public.listings add column if not exists title_en text;
alter table public.listings drop constraint if exists listings_translated_title_size;
alter table public.listings add constraint listings_translated_title_size
  check ((title_fr is null or char_length(title_fr) between 1 and 300)
     and (title_en is null or char_length(title_en) between 1 and 300));

create or replace function public.protect_listing_title_translations()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.title_fr := null;
    new.title_en := null;
  elsif new.title is distinct from old.title then
    new.title_fr := null;
    new.title_en := null;
  elsif auth.uid() is not null then
    -- Only the server's secret-protected RPC writes machine translations.
    new.title_fr := old.title_fr;
    new.title_en := old.title_en;
  end if;
  return new;
end $$;
drop trigger if exists protect_listing_title_translations_trigger on public.listings;
create trigger protect_listing_title_translations_trigger before insert or update
  on public.listings for each row execute function public.protect_listing_title_translations();
revoke all on function public.protect_listing_title_translations() from public, anon, authenticated;

create or replace function public.save_listing_localization(
  p_id bigint, p_title text, p_description text, p_kw text,
  p_title_fr text, p_title_en text, p_secret text
) returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare expected text; changed integer;
begin
  select decrypted_secret into expected from vault.decrypted_secrets where name = 'PUSH_FUNCTION_SECRET' limit 1;
  if expected is null or p_secret is null or p_secret <> expected then return false; end if;
  if length(trim(coalesce(p_title_fr, ''))) not between 1 and 300
     or length(trim(coalesce(p_title_en, ''))) not between 1 and 300 then return false; end if;
  -- Compare in the UPDATE itself: an edit during generation cannot save stale text.
  update public.listings set search_keywords = p_kw,
    title_fr = trim(p_title_fr), title_en = trim(p_title_en)
    where id = p_id and title is not distinct from p_title
      and description is not distinct from p_description;
  get diagnostics changed = row_count;
  return changed = 1;
end $$;
revoke all on function public.save_listing_localization(bigint,text,text,text,text,text,text) from public;
grant execute on function public.save_listing_localization(bigint,text,text,text,text,text,text) to anon, authenticated, service_role;
commit;
