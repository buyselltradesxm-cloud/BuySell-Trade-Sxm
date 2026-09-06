-- ============================================================
--  Buy Sell Trade Sxm — schéma de base de données Supabase
--  À coller dans :  Supabase → SQL Editor → New query → Run
-- ============================================================

-- ------------------------------------------------------------
--  PROFILES  (un profil par utilisateur, lié à auth.users)
-- ------------------------------------------------------------
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text,
  account_type  text default 'personal',       -- 'personal' | 'business'
  account_plan  text default 'personal-free',
  business_name text,
  phone         text,
  created_at    timestamptz default now()
);

-- Colonnes ajoutees apres coup : "add column if not exists" pour que la
-- re-execution sur une base existante les cree sans erreur.
alter table profiles add column if not exists name                  text;
alter table profiles add column if not exists account_type          text default 'personal';
alter table profiles add column if not exists account_plan          text default 'personal-free';
alter table profiles add column if not exists business_name         text;
alter table profiles add column if not exists phone                 text;
alter table profiles add column if not exists created_at            timestamptz default now();
alter table profiles add column if not exists business_phone        text;
alter table profiles add column if not exists business_whatsapp     text;
alter table profiles add column if not exists business_website      text;
alter table profiles add column if not exists business_logo         text;
alter table profiles add column if not exists subscription_status   text;
alter table profiles add column if not exists subscription_started  timestamptz;
alter table profiles add column if not exists stripe_customer_id    text;
alter table profiles add column if not exists stripe_subscription_id text;
alter table profiles add column if not exists subscription_current_period_end timestamptz;
alter table profiles add column if not exists subscription_cancel_at_period_end boolean default false;
alter table profiles add column if not exists role                  text default 'user';

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and role = 'admin'
  );
$$;

create table if not exists banned_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  reason     text,
  banned_by  uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create or replace function is_banned(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.banned_users
     where banned_users.user_id = $1
  );
$$;

create or replace function protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Contexte privilégié (SQL Editor, service_role, cron, trigger d'inscription) :
  -- auth.uid() est NULL. On laisse passer — c'est ainsi qu'on nomme le 1er admin.
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if (new.role is null or new.role <> 'user') and not is_admin() then
      new.role := 'user';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role and not is_admin() then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on profiles;
create trigger protect_profile_role_trigger
  before insert or update on profiles
  for each row execute function protect_profile_role();

alter table profiles enable row level security;

drop policy if exists "profiles: lecture publique" on profiles;
drop policy if exists "profiles: lecture connectés" on profiles;
drop policy if exists "profiles: lecture privee" on profiles;
create policy "profiles: lecture privee"
  on profiles for select to authenticated
  using (auth.uid() = id or is_admin());

drop policy if exists "profiles: chacun gère le sien" on profiles;
create policy "profiles: chacun gère le sien"
  on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles: admin gère tout" on profiles;
create policy "profiles: admin gère tout"
  on profiles for all to authenticated
  using (is_admin())
  with check (is_admin());

-- Crée automatiquement la ligne profile à l'inscription
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when lower(new.email) = 'rxmarketing09@gmail.com' then 'admin' else 'user' end
  )
  on conflict (id) do update
  set name = coalesce(public.profiles.name, excluded.name),
      role = case
        when lower(new.email) = 'rxmarketing09@gmail.com' then 'admin'
        else public.profiles.role
      end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
--  LISTINGS  (les annonces)
-- ------------------------------------------------------------
create table if not exists listings (
  id             bigint generated by default as identity primary key,
  seller_id      uuid references auth.users(id) on delete set null,
  title          text not null,
  category       text not null,                 -- champ "cat" du JS
  subcategory    text,                          -- "sub"
  side           text,                          -- 'fr' | 'nl'
  area           text,
  condition      text,                          -- "cond"
  currency       text default 'eur',            -- "cur"
  price_eur      numeric default 0,             -- "eur"
  price_usd      numeric default 0,             -- "usd"
  description    text,
  vehicle        jsonb,
  delivery       text,                          -- 'meetup' | 'delivery'
  negotiable     boolean default false,
  is_pro         boolean default false,         -- "pro"
  is_urgent      boolean default false,         -- "urgent"
  is_featured    boolean default false,         -- "feat"
  price_dropped  boolean default false,         -- "drop"
  is_salary      boolean default false,         -- "salary"
  is_boosted     boolean default false,
  boost_days     integer,
  boost_price_eur numeric,
  boost_price_usd numeric,
  boost_started_at timestamptz,
  photos         text[] default '{}',
  seller_name    text,
  status         text default 'active',         -- 'active' | 'reserved' | 'sold'
  created_at     timestamptz default now()
);

alter table listings add column if not exists vehicle          jsonb;
alter table listings add column if not exists is_boosted       boolean default false;
alter table listings add column if not exists boost_days       integer;
alter table listings add column if not exists boost_price_eur  numeric;
alter table listings add column if not exists boost_price_usd  numeric;
alter table listings add column if not exists boost_started_at timestamptz;
alter table listings add column if not exists seller_name      text;

create or replace function set_listing_seller_name()
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

drop trigger if exists set_listing_seller_name_trigger on listings;
create trigger set_listing_seller_name_trigger
  before insert or update of seller_id, seller_name on listings
  for each row execute function set_listing_seller_name();

alter table listings enable row level security;

drop policy if exists "listings: lecture publique" on listings;
create policy "listings: lecture publique"
  on listings for select using (true);

drop policy if exists "listings: créer la sienne (connecté)" on listings;
create policy "listings: créer la sienne (connecté)"
  on listings for insert to authenticated
  with check (auth.uid() = seller_id and not is_banned());

drop policy if exists "listings: modifier la sienne" on listings;
create policy "listings: modifier la sienne"
  on listings for update to authenticated
  using (auth.uid() = seller_id and not is_banned())
  with check (auth.uid() = seller_id and not is_banned());   -- empêche de réattribuer l'annonce à autrui

drop policy if exists "listings: supprimer la sienne" on listings;
create policy "listings: supprimer la sienne"
  on listings for delete to authenticated
  using (auth.uid() = seller_id and not is_banned());

drop policy if exists "listings: admin modère tout" on listings;
create policy "listings: admin modère tout"
  on listings for all to authenticated
  using (is_admin())
  with check (is_admin());

create index if not exists listings_category_idx on listings (category);
create index if not exists listings_side_idx     on listings (side);
create index if not exists listings_created_idx  on listings (created_at desc);

-- ------------------------------------------------------------
--  MODERATION  (signalements, bannissements, audit admin)
-- ------------------------------------------------------------
create table if not exists reports (
  id          bigint generated always as identity primary key,
  listing_id  bigint references listings(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason      text not null,
  notes       text,
  status      text default 'open',            -- 'open' | 'reviewing' | 'resolved'
  created_at  timestamptz default now(),
  resolved_at timestamptz
);

alter table reports enable row level security;

drop policy if exists "reports: créer connecté" on reports;
create policy "reports: créer connecté"
  on reports for insert to authenticated
  with check (auth.uid() = reporter_id and not is_banned());

drop policy if exists "reports: admin lit et gère" on reports;
create policy "reports: admin lit et gère"
  on reports for all to authenticated
  using (is_admin())
  with check (is_admin());

create table if not exists banned_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  reason     text,
  banned_by  uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table banned_users enable row level security;

drop policy if exists "banned_users: admin uniquement" on banned_users;
create policy "banned_users: admin uniquement"
  on banned_users for all to authenticated
  using (is_admin())
  with check (is_admin());

create table if not exists admin_events (
  id          bigint generated always as identity primary key,
  admin_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb,
  created_at  timestamptz default now()
);

alter table admin_events enable row level security;

drop policy if exists "admin_events: admin uniquement" on admin_events;
create policy "admin_events: admin uniquement"
  on admin_events for all to authenticated
  using (is_admin())
  with check (is_admin());

create table if not exists admin_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now()
);

alter table admin_settings enable row level security;

drop policy if exists "admin_settings: lecture publique" on admin_settings;
create policy "admin_settings: lecture publique"
  on admin_settings for select using (true);

drop policy if exists "admin_settings: admin gère tout" on admin_settings;
create policy "admin_settings: admin gère tout"
  on admin_settings for all to authenticated
  using (is_admin())
  with check (is_admin());

create or replace function admin_set_listing_status(listing_id bigint, new_status text)
returns public.listings
language plpgsql security definer set search_path = public as $$
declare
  updated_listing public.listings;
begin
  if not is_admin() then
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

create or replace function admin_delete_listing(listing_id bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;
  delete from public.listings where id = listing_id;
  insert into public.admin_events (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'admin_delete_listing', 'listing', listing_id::text, '{}'::jsonb);
  return true;
end;
$$;

grant execute on function admin_set_listing_status(bigint, text) to authenticated;
grant execute on function admin_delete_listing(bigint) to authenticated;

-- ------------------------------------------------------------
--  MESSAGES  (chat entre acheteur et vendeur)
-- ------------------------------------------------------------
create table if not exists messages (
  id           bigint generated always as identity primary key,
  listing_id   bigint references listings(id) on delete cascade,
  sender_id    uuid references auth.users(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete cascade,
  body         text not null,
  read         boolean default false,
  created_at   timestamptz default now()
);

alter table messages enable row level security;

drop policy if exists "messages: lus par les participants" on messages;
create policy "messages: lus par les participants"
  on messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "messages: envoyés par soi" on messages;
create policy "messages: envoyés par soi"
  on messages for insert to authenticated
  with check (auth.uid() = sender_id and not is_banned());

-- Pas de policy UPDATE directe : un message est immuable une fois envoyé.
-- Marquer "lu" passe par cette fonction, qui ne touche QUE la colonne read
-- et seulement si l'appelant est le destinataire.
create or replace function mark_message_read(msg_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  update messages
     set read = true
   where id = msg_id
     and recipient_id = auth.uid();
end;
$$;
-- côté JS :  await db.rpc("mark_message_read", { msg_id: id })

create index if not exists messages_listing_idx on messages (listing_id);
create index if not exists messages_parties_idx on messages (sender_id, recipient_id);

-- Realtime : diffuse les INSERT de la table messages aux clients abonnes.
-- (bloc DO : ne pas planter si la table est deja dans la publication)
do $$
begin
  alter publication supabase_realtime add table messages;
exception
  when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
--  STORAGE  (photos des annonces)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

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
    and not is_banned()
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
      or is_admin()
    )
  );
