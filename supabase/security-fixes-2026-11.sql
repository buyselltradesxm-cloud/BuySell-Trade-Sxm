-- Security fixes of 2026-11-01 (audit leads 4, 5, 6 and 7). Safe to re-run.
-- Apply after security-hardening-v3.sql, granted-plans.sql and
-- email-edge-cron.sql (the Google Play job reuses the Vault secret
-- EMAIL_QUEUE_SECRET that the email job already uses).

begin;

-- ------------------------------------------------------------
-- Lead 5: a message's listing must belong to the sender or the recipient.
-- The free cap counts messages per listing, so naming an unrelated listing
-- used to give a free account five more messages each time.
-- ------------------------------------------------------------
create or replace function public.check_message_listing_link()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() or new.listing_id is null then
    return new;
  end if;
  if not exists (select 1 from public.listings l
                  where l.id = new.listing_id
                    and l.seller_id in (new.sender_id, new.recipient_id)) then
    raise exception 'message_listing_mismatch' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.check_message_listing_link() from public, anon, authenticated;

drop trigger if exists check_message_listing_link_trigger on public.messages;
create trigger check_message_listing_link_trigger
  before insert on public.messages
  for each row execute function public.check_message_listing_link();

-- ------------------------------------------------------------
-- Lead 6: the Pro badge and the boosts included in a plan end with the plan.
-- Included boosts also end after their 30 days.
-- ------------------------------------------------------------
create or replace function public.clear_lapsed_pro_flags()
returns integer language plpgsql security definer set search_path = public as $$
declare
  changed integer := 0;
  n integer;
begin
  -- Sellers whose plan is not active right now.
  update public.listings l
     set is_pro = false
    from public.profiles p
   where p.id = l.seller_id
     and l.is_pro
     and not (p.account_type = 'business'
              and coalesce(p.subscription_status, '') = 'active'
              and (p.subscription_current_period_end is null
                   or p.subscription_current_period_end > now()));
  get diagnostics n = row_count; changed := changed + n;

  update public.listings l
     set is_boosted = false
    from public.profiles p
   where p.id = l.seller_id
     and l.boost_source = 'included_auto'
     and l.is_boosted
     and (l.boost_started_at + make_interval(days => coalesce(l.boost_days, 30)) <= now()
          or not (p.account_type = 'business'
                  and coalesce(p.subscription_status, '') = 'active'
                  and (p.subscription_current_period_end is null
                       or p.subscription_current_period_end > now())));
  get diagnostics n = row_count; changed := changed + n;
  return changed;
end;
$$;
revoke all on function public.clear_lapsed_pro_flags() from public, anon, authenticated;
grant execute on function public.clear_lapsed_pro_flags() to service_role;

-- ------------------------------------------------------------
-- Lead 7: the monthly limit of free accounts counts listings CREATED this
-- month, including ones deleted since. A deleted listing used to free a slot.
-- ------------------------------------------------------------
-- Append-only, one row per listing insert, with its own key: nothing here
-- depends on a value the client could choose or reuse.
create table if not exists public.listing_creations (
  id bigint generated always as identity primary key,
  listing_id bigint not null,
  seller_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists listing_creations_listing_idx
  on public.listing_creations (listing_id);
create index if not exists listing_creations_seller_created_idx
  on public.listing_creations (seller_id, created_at);
alter table public.listing_creations enable row level security;
revoke all on public.listing_creations from public, anon, authenticated;
grant select, insert on public.listing_creations to service_role;

insert into public.listing_creations (listing_id, seller_id, created_at)
select l.id, l.seller_id, coalesce(l.created_at, now())
  from public.listings l
 where l.seller_id is not null
   and not exists (select 1 from public.listing_creations c where c.listing_id = l.id);

create or replace function public.record_listing_creation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.seller_id is not null then
    insert into public.listing_creations (listing_id, seller_id, created_at)
    values (new.id, new.seller_id, now());
  end if;
  return null;
end;
$$;
revoke all on function public.record_listing_creation() from public, anon, authenticated;

drop trigger if exists record_listing_creation_trigger on public.listings;
create trigger record_listing_creation_trigger
  after insert on public.listings
  for each row execute function public.record_listing_creation();

-- Same as security-hardening-v3.sql, except that every account without an
-- active plan (personal, or business whose plan ended) counts creations.
create or replace function public.can_publish_listing(user_id uuid default auth.uid())
returns boolean
language plpgsql stable security definer
set search_path = public
as $$
declare
  user_profile public.profiles;
  pro_active boolean;
  listing_limit integer;
  used_count integer;
begin
  -- Only answer for yourself (or for anyone, as an admin / service role).
  if auth.uid() is not null and user_id is distinct from auth.uid() and not public.is_admin() then
    return false;
  end if;

  select * into user_profile from public.profiles where id = user_id;
  if user_profile.id is null then return false; end if;

  pro_active := user_profile.account_type = 'business'
    and coalesce(user_profile.subscription_status, '') = 'active'
    and (user_profile.subscription_current_period_end is null
         or user_profile.subscription_current_period_end > now());

  listing_limit := public.account_listing_limit(
    case when pro_active then user_profile.account_plan else 'personal-free' end);
  if listing_limit is null then return true; end if;

  if pro_active then
    select count(*) into used_count
      from public.listings
     where seller_id = user_id
       and coalesce(status, 'active') not in ('sold', 'expired');
  else
    select count(*) into used_count
      from public.listing_creations c
     where c.seller_id = user_id
       and c.created_at >= date_trunc('month', now())
       and c.created_at < date_trunc('month', now()) + interval '1 month';
  end if;

  return used_count < listing_limit;
end;
$$;
revoke all on function public.can_publish_listing(uuid) from public;
grant execute on function public.can_publish_listing(uuid) to authenticated;

-- ------------------------------------------------------------
-- Schedules. Lead 4: the Google Play function re-asks Google about every
-- active Play subscription, so refunds and revocations end Pro.
-- ------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'clear-lapsed-pro-flags') then
    perform cron.unschedule('clear-lapsed-pro-flags');
  end if;
  if exists (select 1 from cron.job where jobname = 'reconcile-google-play') then
    perform cron.unschedule('reconcile-google-play');
  end if;
end;
$$;

select cron.schedule('clear-lapsed-pro-flags', '7 * * * *', 'select public.clear_lapsed_pro_flags()');

select cron.schedule(
  'reconcile-google-play',
  '23 */6 * * *',
  $$
  select net.http_post(
    url := 'https://szhaxlmronirhnntlwyb.supabase.co/functions/v1/google-play-purchases',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets
                         where name = 'EMAIL_QUEUE_SECRET' limit 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

commit;
