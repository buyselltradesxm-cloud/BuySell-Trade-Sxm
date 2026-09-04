-- ============================================================
--  Buy Sell Trade Sxm - backend hardening
--  A lancer dans Supabase -> SQL Editor
--
--  Objectif:
--  - garder les profils prives (sauf soi-meme et admin)
--  - garder un nom vendeur public directement sur chaque annonce
--  - limiter les uploads photo au dossier de l'utilisateur
--  - autoriser les admins a supprimer les photos de moderation
-- ============================================================

-- ------------------------------------------------------------
--  LISTINGS: nom vendeur public denormalise
-- ------------------------------------------------------------
alter table public.listings add column if not exists seller_name text;

update public.listings l
set seller_name = coalesce(p.business_name, p.name, l.seller_name)
from public.profiles p
where l.seller_id = p.id
  and (l.seller_name is null or l.seller_name = '');

create or replace function public.set_listing_seller_name()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  display_name text;
begin
  if new.seller_id is not null then
    select coalesce(business_name, name)
      into display_name
      from public.profiles
     where id = new.seller_id;

    if display_name is not null and length(trim(display_name)) > 0 then
      new.seller_name := display_name;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists set_listing_seller_name_trigger on public.listings;
create trigger set_listing_seller_name_trigger
  before insert or update of seller_id, seller_name on public.listings
  for each row execute function public.set_listing_seller_name();

-- ------------------------------------------------------------
--  PROFILES: ne pas exposer tous les profils a tous les comptes
-- ------------------------------------------------------------
drop policy if exists "profiles: lecture publique" on public.profiles;
drop policy if exists "profiles: lecture connectés" on public.profiles;
drop policy if exists "profiles: lecture privee" on public.profiles;

create policy "profiles: lecture privee"
  on public.profiles for select to authenticated
  using (auth.uid() = id or public.is_admin());

-- Les policies existantes "chacun gere le sien" et "admin gere tout"
-- restent en place pour insert/update/delete.

-- ------------------------------------------------------------
--  STORAGE: photos publiques en lecture, upload limite au dossier user
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "listing-photos: lecture publique" on storage.objects;
create policy "listing-photos: lecture publique"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

drop policy if exists "listing-photos: upload connecte" on storage.objects;
drop policy if exists "listing-photos: upload dossier utilisateur" on storage.objects;
create policy "listing-photos: upload dossier utilisateur"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_banned()
  );

drop policy if exists "listing-photos: gestion proprietaire" on storage.objects;
drop policy if exists "listing-photos: suppression proprietaire ou admin" on storage.objects;
create policy "listing-photos: suppression proprietaire ou admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and (
      owner = auth.uid()
      or (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- ------------------------------------------------------------
--  ADMIN RPC: endpoints SQL reserves admin pour actions dangereuses
-- ------------------------------------------------------------
create or replace function public.admin_set_listing_status(listing_id bigint, new_status text)
returns public.listings
language plpgsql security definer set search_path = public as $$
declare
  updated_listing public.listings;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  if new_status not in ('active', 'reserved', 'sold') then
    raise exception 'invalid status';
  end if;

  update public.listings
     set status = new_status
   where id = listing_id
   returning * into updated_listing;

  insert into public.admin_events (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'admin_set_listing_status', 'listing', listing_id::text, jsonb_build_object('status', new_status));

  return updated_listing;
end;
$$;

create or replace function public.admin_delete_listing(listing_id bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  delete from public.listings where id = listing_id;

  insert into public.admin_events (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'admin_delete_listing', 'listing', listing_id::text, '{}'::jsonb);

  return true;
end;
$$;

grant execute on function public.admin_set_listing_status(bigint, text) to authenticated;
grant execute on function public.admin_delete_listing(bigint) to authenticated;
