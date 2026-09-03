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

alter table profiles enable row level security;

create policy "profiles: lecture publique"
  on profiles for select using (true);

create policy "profiles: chacun gère le sien"
  on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- Crée automatiquement la ligne profile à l'inscription
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
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
  id             bigint generated always as identity primary key,
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
  delivery       text,                          -- 'meetup' | 'delivery'
  negotiable     boolean default false,
  is_pro         boolean default false,         -- "pro"
  is_urgent      boolean default false,         -- "urgent"
  is_featured    boolean default false,         -- "feat"
  price_dropped  boolean default false,         -- "drop"
  is_salary      boolean default false,         -- "salary"
  photos         text[] default '{}',
  status         text default 'active',         -- 'active' | 'reserved' | 'sold'
  created_at     timestamptz default now()
);

alter table listings enable row level security;

create policy "listings: lecture publique"
  on listings for select using (true);

create policy "listings: créer la sienne (connecté)"
  on listings for insert to authenticated
  with check (auth.uid() = seller_id);

create policy "listings: modifier la sienne"
  on listings for update to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);   -- empêche de réattribuer l'annonce à autrui

create policy "listings: supprimer la sienne"
  on listings for delete to authenticated
  using (auth.uid() = seller_id);

create index if not exists listings_category_idx on listings (category);
create index if not exists listings_side_idx     on listings (side);
create index if not exists listings_created_idx  on listings (created_at desc);

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

create policy "messages: lus par les participants"
  on messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "messages: envoyés par soi"
  on messages for insert to authenticated
  with check (auth.uid() = sender_id);

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
