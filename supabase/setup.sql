-- ============================================================
--  Buy Sell Trade Sxm — installation complete de la base
--  Projet Supabase : ujykgiitlcuqiiepsyiz
--  Usage : Supabase Dashboard > SQL Editor > New query >
--          coller tout ce fichier > Run.  Rejouable sans risque.
--  Genere depuis schema.sql + seed.sql — ne pas editer a la main.
-- ============================================================

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


-- ============================================================
--  Donnees de demonstration — a coller dans SQL Editor APRES schema.sql
--  Annonces d exemple, sans seller_id.
-- ============================================================

-- Si la table a ete creee avec "generated always as identity" (ancien schema),
-- on autorise l insertion d ids explicites. Sans effet si deja "by default".
alter table listings alter column id set generated by default;

insert into listings
  (id, title, category, subcategory, side, area, condition, currency,
   price_eur, price_usd, delivery, negotiable, is_pro, is_urgent,
   is_featured, price_dropped, is_salary)
values
  (1, 'Scooter Piaggio Liberty 125, révisé, 2 casques', 'scoot', 'scooter-sale', 'fr', 'Marigot', 'tbe', 'eur', 850, 920, 'meetup', true, false, true, true, false, false),
  (2, 'T2 vue lagon, meublé, dispo 1er du mois', 'immo', 'rent-apartment', 'nl', 'Simpson Bay', 'bon', 'usd', 1250, 1350, 'meetup', false, true, false, true, false, false),
  (3, 'Hobie Cat 16 avec remorque, voiles OK', 'bat', null, 'nl', 'Simpson Bay', 'bon', 'eur', 3200, 3450, null, false, false, false, true, false, false),
  (4, 'iPhone 13 128 Go, batterie 89%, sous coque', 'elec', 'phones', 'fr', 'Grand Case', 'tbe', 'eur', 360, 390, 'meetup', true, false, true, true, true, false),
  (5, 'Canapé rotin 3 places + coussins déperlants', 'meub', null, 'nl', 'Cole Bay', 'bon', 'usd', 210, 225, 'delivery', true, false, false, false, false, false),
  (6, 'Yamaha 4x4 Kodiak 450, entretien à jour', 'scoot', 'motorbike-sale', 'nl', 'Dutch Quarter', 'tbe', 'usd', 4800, 5150, null, false, false, false, false, false, false),
  (7, 'Frigo américain Samsung, froid ventilé', 'menag', null, 'fr', 'Cul-de-Sac', 'bon', 'eur', 290, 315, 'delivery', false, false, false, false, false, false),
  (8, 'Serveur / barman expérimenté - Baie Orientale', 'job', 'hospitality', 'fr', 'Baie Orientale', 'neuf', 'eur', 0, 0, null, false, true, true, false, false, true),
  (9, 'Kitesurf Duotone 10m + barre, pack complet', 'lois', null, 'nl', 'Cupecoy', 'tbe', 'usd', 640, 690, null, false, false, false, false, false, false),
  (10, 'Suzuki Jimny 2019, clim, 62 000 km', 'voit', 'car-sale', 'nl', 'Philipsburg', 'tbe', 'usd', 14500, 15600, 'pickup', true, true, false, false, true, false),
  (11, 'MacBook Air M1, 8/256, clavier AZERTY', 'elec', 'laptops', 'fr', 'Marigot', 'tbe', 'eur', 560, 605, 'meetup', true, false, false, false, false, false),
  (12, 'Studio Grand Case, pieds dans l''eau, courte durée', 'immo', 'rent-apartment', 'fr', 'Grand Case', 'bon', 'eur', 900, 970, null, false, true, false, false, false, false),
  (13, 'Annexe 3,10 m + moteur Tohatsu 9.8, révisé', 'bat', null, 'nl', 'Simpson Bay', 'bon', 'eur', 2100, 2260, null, false, false, false, false, false, false),
  (14, 'Lot 6 chaises teck jardin + table pliante', 'meub', null, 'fr', 'Sandy Ground', 'corr', 'eur', 120, 130, null, false, false, false, false, false, false),
  (15, 'Groupe électrogène Honda 2 kVA, insonorisé', 'pro', null, 'nl', 'Cole Bay', 'tbe', 'usd', 430, 465, null, false, true, true, false, false, false),
  (16, 'Vélo électrique VTC, 2 batteries, phare neuf', 'lois', null, 'fr', 'Quartier d''Orléans', 'bon', 'eur', 520, 560, null, false, false, false, false, true, false),
  (17, 'Climatiseur split 12000 BTU, pose incluse', 'menag', null, 'nl', 'Maho', 'neuf', 'usd', 340, 365, 'delivery', false, true, false, false, false, false),
  (18, 'Ménage villas & check-out, équipe dispo', 'serv', null, 'nl', 'Cupecoy', 'neuf', 'usd', 0, 0, 'delivery', false, true, false, false, false, true),
  (19, 'PS5 + 2 manettes + 4 jeux, boîte d''origine', 'elec', 'gaming', 'fr', 'Marigot', 'tbe', 'eur', 380, 410, null, false, false, true, false, false, false),
  (20, 'Renault Clio IV 2016, CT OK, 1re main', 'voit', 'car-sale', 'fr', 'Cul-de-Sac', 'bon', 'eur', 6200, 6700, null, false, false, false, false, false, false),
  (21, 'Paddle gonflable 10''6 + pagaie carbone', 'lois', null, 'nl', 'Simpson Bay', 'tbe', 'usd', 250, 270, null, false, false, false, false, false, false),
  (22, 'Meuble TV manguier massif, 1,60 m', 'meub', null, 'fr', 'Baie Orientale', 'tbe', 'eur', 180, 195, null, false, false, false, false, false, false),
  (23, 'Compresseur plongée Bauer, 225 bar, révisé', 'pro', null, 'nl', 'Philipsburg', 'bon', 'usd', 2600, 2800, null, false, true, false, false, false, false),
  (24, 'Table à langer + transat + parc, lot bébé', 'meub', null, 'fr', 'Grand Case', 'bon', 'eur', 90, 98, null, false, false, false, false, false, false),
  (25, 'Jantes 17" + pneus été 205/45, jeu de 4', 'voit', 'auto-parts', 'nl', 'Cole Bay', 'corr', 'usd', 220, 238, null, false, false, false, false, false, false),
  (26, 'Cours de français & anglais, particuliers', 'serv', null, 'fr', 'Marigot', 'neuf', 'eur', 0, 0, null, false, false, false, false, false, true),
  (27, 'Hyundai i10 automatique à louer - journée ou semaine', 'locvoit', null, 'nl', 'Maho', 'tbe', 'usd', 42, 45, 'pickup', false, true, false, false, false, false),
  (28, '2 billets concert local samedi soir', 'billet', null, 'fr', 'Marigot', 'neuf', 'eur', 35, 38, null, false, false, true, false, false, false),
  (29, 'Bon plan: lot parasol + 2 chaises plage', 'bonplan', null, 'nl', 'Mullet Bay', 'bon', 'usd', 55, 60, null, false, false, false, false, false, false),
  (30, 'Cartons de déménagement propres, lot complet', 'autres', null, 'fr', 'Concordia', 'bon', 'eur', 20, 22, null, false, false, false, false, false, false),
  (31, 'Colombo de poulet maison - portion à emporter', 'food', 'prepared-food', 'fr', 'Marigot', 'neuf', 'eur', 12, 13, 'pickup', false, true, false, true, false, false),
  (32, 'Panier de fruits et légumes locaux', 'food', 'fresh-produce', 'nl', 'Philipsburg', 'neuf', 'usd', 23, 25, 'delivery', false, true, false, false, false, false),
  (33, 'Viennoiseries fraîches - boîte de 8', 'food', 'bakery', 'fr', 'Grand Case', 'neuf', 'eur', 16, 18, 'pickup', false, true, false, false, false, false)
on conflict (id) do nothing;

insert into listings
  (id, title, category, subcategory, side, area, condition, currency,
   price_eur, price_usd, delivery, negotiable, is_pro, is_urgent,
   is_featured, price_dropped, is_salary, description, photos)
values
  (34, 'Toyota Hilux double cabine - inventaire concessionnaire', 'voit', 'dealer-inventory', 'nl', 'Philipsburg', 'tbe', 'usd', 25200, 27200, 'pickup', false, true, false, true, false, false, 'Véhicule visible chez le concessionnaire. Financement et reprise possibles sur demande.', array[
    'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=80'
  ]),
  (35, 'Jet ski Yamaha VX Cruiser 2021', 'bat', 'jet-ski-sale', 'fr', 'Baie Nettlé', 'bon', 'eur', 7600, 8200, 'meetup', true, false, false, false, false, false, null, array[
    'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'
  ]),
  (36, 'Villa 2 chambres - location vacances Orient Bay', 'immo', 'vacation-rental', 'fr', 'Baie Orientale', 'tbe', 'eur', 185, 200, 'meetup', false, true, false, false, false, false, null, array[
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80'
  ]),
  (37, 'Offre d''emploi: réceptionniste hôtel - Maho', 'job', 'paid-job-post', 'nl', 'Maho', 'neuf', 'usd', 0, 0, null, false, true, true, false, false, true, null, array[
    'https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80'
  ]),
  (38, 'Service nettoyage villas - check-in / check-out', 'serv', 'cleaning', 'fr', 'Terres Basses', 'neuf', 'eur', 0, 0, 'delivery', false, true, false, false, false, true, null, array[
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=900&q=80'
  ]),
  (39, 'Coiffure braids & brushing à domicile', 'beauty', 'hairdresser', 'nl', 'Cole Bay', 'neuf', 'usd', 0, 0, 'meetup', false, true, false, false, false, true, null, array[
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80'
  ]),
  (40, 'Nintendo Switch OLED + 3 jeux', 'gaming', 'nintendo', 'fr', 'Marigot', 'tbe', 'eur', 240, 260, 'meetup', true, false, true, false, false, false, null, array[
    'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=900&q=80'
  ]),
  (41, 'Accessoires chien: panier, laisse, gamelles', 'pets', 'pet-supplies', 'nl', 'Simpson Bay', 'bon', 'usd', 42, 45, 'pickup', true, false, false, false, false, false, null, array[
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=900&q=80'
  ])
on conflict (id) do nothing;

update listings
set photos = seed_photos.photos
from (values
  (1, array['https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=900&q=80']),
  (2, array['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80']),
  (3, array['https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80']),
  (4, array['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80']),
  (5, array['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80']),
  (10, array['https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=80']),
  (20, array['https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=80']),
  (27, array['https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80']),
  (31, array['https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80']),
  (32, array['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80']),
  (33, array['https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80'])
) as seed_photos(id, photos)
where listings.id = seed_photos.id
  and coalesce(cardinality(listings.photos), 0) = 0;

update listings
set photos = seed_photos.photos
from (values
  (6, array['https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=900&q=80']),
  (7, array['https://images.unsplash.com/photo-1586208958839-06c17cacdf08?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80']),
  (8, array['https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80']),
  (9, array['https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80']),
  (11, array['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80']),
  (12, array['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80']),
  (13, array['https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80']),
  (14, array['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80']),
  (15, array['https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80']),
  (16, array['https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80']),
  (17, array['https://images.unsplash.com/photo-1586208958839-06c17cacdf08?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80']),
  (18, array['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=900&q=80']),
  (19, array['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=80']),
  (21, array['https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80']),
  (22, array['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80']),
  (23, array['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80']),
  (24, array['https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80']),
  (25, array['https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=80']),
  (26, array['https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=900&q=80']),
  (28, array['https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=80']),
  (29, array['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=900&q=80']),
  (30, array['https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=900&q=80'])
) as seed_photos(id, photos)
where listings.id = seed_photos.id
  and coalesce(cardinality(listings.photos), 0) = 0;

-- recale le compteur d id apres insertion d ids explicites
select setval(
  pg_get_serial_sequence('listings','id'),
  coalesce((select max(id) from listings), 1)
);
