-- ============================================================
--  Buy Sell Trade Sxm - correctif admin Supabase
--  A lancer dans Supabase -> SQL Editor
-- ============================================================

alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists business_phone text;
alter table public.profiles add column if not exists business_whatsapp text;
alter table public.profiles add column if not exists business_website text;
alter table public.profiles add column if not exists business_logo text;
alter table public.profiles add column if not exists subscription_status text;
alter table public.profiles add column if not exists subscription_started timestamptz;
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists subscription_current_period_end timestamptz;
alter table public.profiles add column if not exists subscription_cancel_at_period_end boolean default false;

create table if not exists public.banned_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  reason     text,
  banned_by  uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and role = 'admin'
  );
$$;

create or replace function public.is_banned(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.banned_users
     where banned_users.user_id = $1
  );
$$;

create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if (new.role is null or new.role <> 'user') and not public.is_admin() then
      new.role := 'user';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role and not public.is_admin() then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
  before insert or update on public.profiles
  for each row execute function public.protect_profile_role();

create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  listing_id  bigint references public.listings(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason      text not null,
  notes       text,
  status      text default 'open',
  created_at  timestamptz default now(),
  resolved_at timestamptz
);

create table if not exists public.admin_events (
  id          bigint generated always as identity primary key,
  admin_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb,
  created_at  timestamptz default now()
);

create table if not exists public.admin_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.reports enable row level security;
alter table public.banned_users enable row level security;
alter table public.admin_events enable row level security;
alter table public.admin_settings enable row level security;

drop policy if exists "profiles: lecture publique" on public.profiles;
drop policy if exists "profiles: lecture connectés" on public.profiles;
drop policy if exists "profiles: lecture privee" on public.profiles;
create policy "profiles: lecture privee"
  on public.profiles for select to authenticated
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles: chacun gère le sien" on public.profiles;
create policy "profiles: chacun gère le sien"
  on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles: admin gère tout" on public.profiles;
create policy "profiles: admin gère tout"
  on public.profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "listings: créer la sienne (connecté)" on public.listings;
create policy "listings: créer la sienne (connecté)"
  on public.listings for insert to authenticated
  with check (auth.uid() = seller_id and not public.is_banned());

drop policy if exists "listings: modifier la sienne" on public.listings;
create policy "listings: modifier la sienne"
  on public.listings for update to authenticated
  using (auth.uid() = seller_id and not public.is_banned())
  with check (auth.uid() = seller_id and not public.is_banned());

drop policy if exists "listings: supprimer la sienne" on public.listings;
create policy "listings: supprimer la sienne"
  on public.listings for delete to authenticated
  using (auth.uid() = seller_id and not public.is_banned());

drop policy if exists "listings: admin modère tout" on public.listings;
create policy "listings: admin modère tout"
  on public.listings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "reports: créer connecté" on public.reports;
create policy "reports: créer connecté"
  on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id and not public.is_banned());

drop policy if exists "reports: admin lit et gère" on public.reports;
create policy "reports: admin lit et gère"
  on public.reports for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "banned_users: admin uniquement" on public.banned_users;
create policy "banned_users: admin uniquement"
  on public.banned_users for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin_events: admin uniquement" on public.admin_events;
create policy "admin_events: admin uniquement"
  on public.admin_events for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin_settings: lecture publique" on public.admin_settings;
create policy "admin_settings: lecture publique"
  on public.admin_settings for select using (true);

drop policy if exists "admin_settings: admin gère tout" on public.admin_settings;
create policy "admin_settings: admin gère tout"
  on public.admin_settings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "messages: envoyés par soi" on public.messages;
create policy "messages: envoyés par soi"
  on public.messages for insert to authenticated
  with check (auth.uid() = sender_id and not public.is_banned());

insert into public.profiles (id, name, role)
select
  id,
  coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  'admin'
from auth.users
where lower(email) in (
  'rxmarketing09@gmail.com'
)
on conflict (id) do update
set role = 'admin',
    name = coalesce(public.profiles.name, excluded.name);

select
  u.email,
  p.id,
  p.role,
  p.name
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) in (
  'rxmarketing09@gmail.com'
)
order by u.email;
