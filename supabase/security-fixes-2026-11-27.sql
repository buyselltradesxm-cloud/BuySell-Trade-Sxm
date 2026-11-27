-- Security fixes of 2026-11-27 (see the baas-security-audit check that day).
--
-- 1. A seller's phone number stays readable through the public listings API
--    after the listing expired or was sold. An hourly job moves it into a
--    locked archive; renewing or reactivating the listing brings it back.
--    The phone-only update fires no follower push, keyword request or
--    re-moderation (those triggers look at moderation status, title,
--    description and category only).
-- 2. admin_settings was readable by everyone. Visitors only need the
--    category_status row (hidden categories); every other row is admin-only.

create table if not exists public.listing_phone_archive (
  listing_id bigint primary key references public.listings(id) on delete cascade,
  seller_phone text not null,
  archived_at timestamptz not null default now()
);
alter table public.listing_phone_archive enable row level security;
revoke all on public.listing_phone_archive from public, anon, authenticated;

create or replace function public.archive_inactive_listing_phones()
returns integer language plpgsql security definer set search_path = public as $$
declare moved integer;
begin
  with gone as (
    insert into public.listing_phone_archive (listing_id, seller_phone)
    select l.id, l.seller_phone from public.listings l
     where coalesce(l.seller_phone, '') <> ''
       and (coalesce(l.status, 'active') <> 'active' or (l.expires_at is not null and l.expires_at <= now()))
    on conflict (listing_id) do update set seller_phone = excluded.seller_phone, archived_at = now()
    returning listing_id
  )
  update public.listings l set seller_phone = null from gone where l.id = gone.listing_id;
  get diagnostics moved = row_count;
  return moved;
end;
$$;
revoke all on function public.archive_inactive_listing_phones() from public, anon, authenticated;

-- Renewed or reactivated by its seller: put the archived phone back, unless the
-- seller typed a new one in the same edit.
create or replace function public.restore_listing_phone()
returns trigger language plpgsql security definer set search_path = public as $$
declare kept text;
begin
  if new.seller_phone is null
     and coalesce(new.status, 'active') = 'active' and (new.expires_at is null or new.expires_at > now())
     and (coalesce(old.status, 'active') <> 'active' or (old.expires_at is not null and old.expires_at <= now())) then
    delete from public.listing_phone_archive a where a.listing_id = new.id returning a.seller_phone into kept;
    if kept is not null then new.seller_phone := kept; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.restore_listing_phone() from public, anon, authenticated;
drop trigger if exists restore_listing_phone_trigger on public.listings;
create trigger restore_listing_phone_trigger before update on public.listings
  for each row execute function public.restore_listing_phone();

select cron.unschedule(jobid) from cron.job where jobname = 'archive-inactive-listing-phones';
select cron.schedule('archive-inactive-listing-phones', '41 * * * *', 'select public.archive_inactive_listing_phones();');
select public.archive_inactive_listing_phones();

drop policy if exists "admin_settings: lecture publique" on public.admin_settings;
drop policy if exists "admin_settings: public category status" on public.admin_settings;
create policy "admin_settings: public category status" on public.admin_settings
  for select to public using (key = 'category_status' or public.is_admin());
