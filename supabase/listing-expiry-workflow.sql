-- Buy Sell Trade SXM - workflow expiration / relance annonces
-- A lancer dans Supabase SQL Editor apres schema.sql/admin-fix/pro-plan-limits.

create extension if not exists pgcrypto;

alter table public.listings add column if not exists expires_at timestamptz;
alter table public.listings add column if not exists renewal_requested_at timestamptz;
alter table public.listings add column if not exists renewal_response_at timestamptz;
alter table public.listings add column if not exists expired_at timestamptz;

update public.listings
   set expires_at = coalesce(expires_at, created_at + interval '30 days')
 where expires_at is null;

create or replace function public.set_listing_expiry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_at = coalesce(new.created_at, now());
  new.expires_at = coalesce(new.expires_at, new.created_at + interval '30 days');
  return new;
end;
$$;

drop trigger if exists set_listing_expiry_trigger on public.listings;
create trigger set_listing_expiry_trigger
  before insert on public.listings
  for each row execute function public.set_listing_expiry();

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id bigint references public.listings(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  action_required boolean default false,
  read_at timestamptz,
  created_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create unique index if not exists app_notifications_listing_kind_unique
  on public.app_notifications (user_id, listing_id, kind)
  where listing_id is not null;

alter table public.app_notifications enable row level security;

drop policy if exists "app_notifications: lecture propriétaire" on public.app_notifications;
create policy "app_notifications: lecture propriétaire"
  on public.app_notifications for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "app_notifications: marquer lue" on public.app_notifications;
create policy "app_notifications: marquer lue"
  on public.app_notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  listing_id bigint references public.listings(id) on delete cascade,
  recipient_email text not null,
  template text not null,
  subject text not null,
  payload jsonb default '{}'::jsonb,
  status text default 'pending',
  attempts integer default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

alter table public.email_queue enable row level security;

drop policy if exists "email_queue: admin only" on public.email_queue;
create policy "email_queue: admin only"
  on public.email_queue for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "listings: lecture publique" on public.listings;
create policy "listings: lecture publique"
  on public.listings for select
  using (
    coalesce(status, 'active') <> 'expired'
    or auth.uid() = seller_id
    or public.is_admin()
  );

create or replace function public.confirm_listing_available(listing_id bigint)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_listing public.listings;
begin
  update public.listings
     set status = 'active',
         expires_at = now() + interval '30 days',
         renewal_response_at = now(),
         renewal_requested_at = null,
         expired_at = null
   where id = listing_id
     and seller_id = auth.uid()
   returning * into updated_listing;

  if updated_listing.id is null then
    raise exception 'listing not found or not yours';
  end if;

  delete from public.app_notifications
   where listing_id = confirm_listing_available.listing_id
     and user_id = auth.uid()
     and kind = 'listing_renewal_required';

  return updated_listing;
end;
$$;

revoke execute on function public.confirm_listing_available(bigint) from public;
grant execute on function public.confirm_listing_available(bigint) to authenticated;

create or replace function public.enqueue_listing_renewal_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  queued_count integer := 0;
begin
  with due as (
    select l.id, l.seller_id, l.title, u.email
      from public.listings l
      join auth.users u on u.id = l.seller_id
     where l.seller_id is not null
       and coalesce(l.status, 'active') = 'active'
       and coalesce(l.expires_at, l.created_at + interval '30 days') <= now()
       and l.renewal_requested_at is null
  ),
  notifications as (
    insert into public.app_notifications (user_id, listing_id, kind, title, body, action_required, metadata)
    select seller_id,
           id,
           'listing_renewal_required',
           'Votre annonce est-elle encore disponible ?',
           title || ' a atteint 30 jours. Choisissez: garder, vendu ou supprimer.',
           true,
           jsonb_build_object('listing_title', title)
      from due
    on conflict (user_id, listing_id, kind) where listing_id is not null do nothing
    returning id
  ),
  emails as (
    insert into public.email_queue (user_id, listing_id, recipient_email, template, subject, payload)
    select seller_id,
           id,
           email,
           'listing-renewal',
           'Votre annonce est-elle encore disponible ?',
           jsonb_build_object('listing_id', id, 'listing_title', title)
      from due
     where email is not null
       and not exists (
         select 1 from public.email_queue q
          where q.listing_id = due.id
            and q.user_id = due.seller_id
            and q.template = 'listing-renewal'
            and q.created_at > now() - interval '7 days'
       )
    returning id
  )
  update public.listings l
     set renewal_requested_at = now()
    from due
   where l.id = due.id;

  get diagnostics queued_count = row_count;
  return queued_count;
end;
$$;

revoke execute on function public.enqueue_listing_renewal_reminders() from public;
grant execute on function public.enqueue_listing_renewal_reminders() to service_role;

create or replace function public.expire_unconfirmed_listings(grace_days integer default 5)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer := 0;
begin
  update public.listings
     set status = 'expired',
         expired_at = now()
   where coalesce(status, 'active') = 'active'
     and renewal_requested_at is not null
     and renewal_response_at is null
     and renewal_requested_at <= now() - make_interval(days => greatest(grace_days, 1));

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

revoke execute on function public.expire_unconfirmed_listings(integer) from public;
grant execute on function public.expire_unconfirmed_listings(integer) to service_role;

create or replace function public.admin_set_listing_status(listing_id bigint, new_status text)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_listing public.listings;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  if new_status not in ('active', 'reserved', 'sold', 'expired') then
    raise exception 'invalid status';
  end if;

  update public.listings
     set status = new_status,
         expired_at = case when new_status = 'expired' then now() else expired_at end
   where id = listing_id
   returning * into updated_listing;

  insert into public.admin_events(actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'admin_set_listing_status', 'listing', listing_id::text, jsonb_build_object('status', new_status));

  return updated_listing;
end;
$$;

revoke execute on function public.admin_set_listing_status(bigint, text) from public;
grant execute on function public.admin_set_listing_status(bigint, text) to authenticated;

-- Option automatique recommandé dans Supabase si pg_cron est disponible:
-- select cron.schedule('bstsxm-renewal-reminders', '0 8 * * *', $$select public.enqueue_listing_renewal_reminders();$$);
-- select cron.schedule('bstsxm-expire-unconfirmed', '0 9 * * *', $$select public.expire_unconfirmed_listings(5);$$);
--
-- Important: email_queue prépare les emails. L'envoi réel doit être branché
-- ensuite avec une Edge Function ou un worker SMTP/Resend sécurisé.
