-- Repair projects where public.profiles already existed before Buy Sell Trade SXM.
-- The original create table if not exists does not add missing base columns.

alter table public.profiles add column if not exists name                  text;
alter table public.profiles add column if not exists account_type          text default 'personal';
alter table public.profiles add column if not exists account_plan          text default 'personal-free';
alter table public.profiles add column if not exists business_name         text;
alter table public.profiles add column if not exists phone                 text;
alter table public.profiles add column if not exists created_at            timestamptz default now();
alter table public.profiles add column if not exists business_phone        text;
alter table public.profiles add column if not exists business_whatsapp     text;
alter table public.profiles add column if not exists business_website      text;
alter table public.profiles add column if not exists business_logo         text;
alter table public.profiles add column if not exists subscription_status   text;
alter table public.profiles add column if not exists subscription_started  timestamptz;
alter table public.profiles add column if not exists role                  text default 'user';

update public.profiles
set
  account_type = coalesce(account_type, 'personal'),
  account_plan = coalesce(account_plan, 'personal-free'),
  role = coalesce(role, 'user'),
  created_at = coalesce(created_at, now());
