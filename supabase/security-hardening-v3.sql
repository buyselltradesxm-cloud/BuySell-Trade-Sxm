-- Buy Sell Trade SXM -- security hardening v3 (audit of 2026-10-02)
-- Run once as the database owner (all-or-nothing: one transaction):
--   supabase db query --linked --file supabase/security-hardening-v3.sql
-- Idempotent -- safe to re-run.

begin;

-- ------------------------------------------------------------
-- 1) Stored-XSS backstop for listings.area / listings.side.
--    The UI offers both as fixed choices, so the frontend rendered them
--    without esc() -- but the columns are free text and a direct
--    /rest/v1/listings call could store markup in them. The frontend now
--    escapes both; this keeps markup out of the table regardless of which
--    client (web, app, a future one) renders it.
-- ------------------------------------------------------------
create or replace function public.sanitize_listing_input()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.title := left(btrim(regexp_replace(coalesce(new.title, ''), '[[:cntrl:]]', '', 'g')), 140);
  new.description := nullif(left(btrim(regexp_replace(coalesce(new.description, ''), '[[:cntrl:]]', '', 'g')), 10000), '');
  new.seller_name := nullif(left(btrim(regexp_replace(coalesce(new.seller_name, ''), '[[:cntrl:]]', '', 'g')), 120), '');
  new.area := nullif(left(btrim(regexp_replace(coalesce(new.area, ''), '[<>"''`[:cntrl:]]', '', 'g')), 80), '');
  new.side := case when new.side in ('fr', 'nl') then new.side else null end;
  return new;
end;
$$;
revoke all on function public.sanitize_listing_input() from public;

-- ------------------------------------------------------------
-- 2) profiles: anon never needs the table. RLS already returns zero rows
--    to anon ("lecture privee" is authenticated-only), but the grant
--    covers every column -- email, phone, stripe_customer_id -- so a
--    single mistaken "public read" policy later would expose all of it.
--    The frontend's seller-name lookup already tolerates an error here.
-- ------------------------------------------------------------
revoke all on public.profiles from anon;

-- ------------------------------------------------------------
-- 3) is_banned(): any signed-in user could ask whether ANY other user is
--    banned. Policies only ever call it with the default (auth.uid()),
--    so answer for yourself, or for anyone if you are an admin.
-- ------------------------------------------------------------
create or replace function public.is_banned(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.banned_users
     where banned_users.user_id = $1
       and ($1 = auth.uid() or public.is_admin())
  );
$$;
revoke all on function public.is_banned(uuid) from public;
grant execute on function public.is_banned(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) Message rate limit. "messages: envoyés par soi" lets a signed-in
--    user insert a message to ANY recipient with no cap, and every insert
--    also fires a push notification -- so one script can spam every
--    seller's phone. Enforced here (not in the browser) because the
--    Data API is reachable directly with the public key.
-- ------------------------------------------------------------
create or replace function public.message_rate_ok(sender uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  last_minute integer;
  last_day integer;
begin
  select count(*) filter (where created_at > now() - interval '1 minute'),
         count(*)
    into last_minute, last_day
    from public.messages
   where sender_id = sender
     and created_at > now() - interval '1 day';

  -- Defaults chosen in the 2026-10-02 audit: generous for a buyer writing
  -- to a dozen sellers in an evening, far below what a script sends.
  -- Adjust the two numbers here if real users hit them.
  return last_minute < 10 and last_day < 200;
end;
$$;
revoke all on function public.message_rate_ok(uuid) from public, anon, authenticated;

create or replace function public.enforce_message_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Service-role / cron writes (auth.uid() is null) and admins are exempt.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if not public.message_rate_ok(new.sender_id) then
    raise exception 'message rate limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_message_rate_limit() from public;

drop trigger if exists enforce_message_rate_limit_trigger on public.messages;
create trigger enforce_message_rate_limit_trigger
  before insert on public.messages
  for each row execute function public.enforce_message_rate_limit();

-- ------------------------------------------------------------
-- 5) Unsubscribe link: stop keying it on the profile id. That id is the
--    same value as listings.seller_id, which anyone can read, so the old
--    unsubscribe_renewal_emails(uuid) let any visitor switch off any
--    seller's renewal reminders (their listings then expire silently).
--    Each profile gets its own random token, only ever sent to that
--    seller's inbox; the anonymous RPC is keyed on the token instead.
--    Deploy send-email-queue after running this so new emails carry the
--    token. Old ?uid= links still work for the signed-in owner only.
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create or replace function public.unsubscribe_renewal_by_token(p_token uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with updated as (
    update public.profiles set renewal_emails_enabled = false
     where unsubscribe_token = p_token
    returning 1
  )
  select exists (select 1 from updated);
$$;
revoke all on function public.unsubscribe_renewal_by_token(uuid) from public;
grant execute on function public.unsubscribe_renewal_by_token(uuid) to anon, authenticated;

drop function if exists public.unsubscribe_renewal_emails(uuid);

-- Same body as renewal-email-unsubscribe.sql, plus the token in the
-- email payload so the worker can build the link.
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
    select l.id, l.seller_id, l.title, u.email, p.unsubscribe_token
      from public.listings l
      join auth.users u on u.id = l.seller_id
      join public.profiles p on p.id = l.seller_id
     where l.seller_id is not null
       and coalesce(l.status, 'active') = 'active'
       and coalesce(l.expires_at, l.created_at + interval '30 days') <= now()
       and l.renewal_requested_at is null
       and coalesce(p.renewal_emails_enabled, true) = true
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
    -- Predicate must match the live unique index
    -- app_notifications_listing_kind_unique (... where read_at is null);
    -- the previous "where listing_id is not null" did not, which Postgres
    -- rejects as an ON CONFLICT target.
    on conflict (user_id, listing_id, kind) where read_at is null do nothing
    returning id
  ),
  emails as (
    insert into public.email_queue (user_id, listing_id, recipient_email, template, subject, payload)
    select seller_id,
           id,
           email,
           'listing-renewal',
           'Votre annonce est-elle encore disponible ?',
           jsonb_build_object('listing_id', id, 'listing_title', title, 'unsubscribe_token', unsubscribe_token)
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

-- ------------------------------------------------------------
-- 6) Listing limits, enforced by the database. The plan limits were only
--    checked in the browser: account_listing_limit() / can_publish_listing()
--    from pro-plan-limits.sql were not present in the live database on
--    2026-10-02, so a direct /rest/v1/listings insert could exceed any plan.
--    The numbers and the counting rule mirror ACCOUNT_PLANS and
--    publicationUsageCountFor() in the frontend exactly:
--      - a paid plan only counts while the subscription is active,
--        otherwise the free limit applies;
--      - business accounts: listings currently live (not sold / expired);
--      - personal accounts: listings created this calendar month.
--    Done as a trigger rather than an RLS policy so it holds whatever
--    insert policies exist on the table.
-- ------------------------------------------------------------
create or replace function public.account_listing_limit(plan_name text)
returns integer
language sql immutable
set search_path = public
as $$
  select case coalesce(plan_name, 'personal-free')
    when 'personal-free' then 5
    when 'pro-starter' then 10
    when 'pro-business' then 30
    when 'pro-premium' then 75
    when 'pro-elite' then 150
    when 'pro-unlimited' then null
    else 5
  end;
$$;

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

  if user_profile.account_type = 'business' then
    select count(*) into used_count
      from public.listings
     where seller_id = user_id
       and coalesce(status, 'active') not in ('sold', 'expired');
  else
    select count(*) into used_count
      from public.listings
     where seller_id = user_id
       and created_at >= date_trunc('month', now())
       and created_at < date_trunc('month', now()) + interval '1 month';
  end if;

  return used_count < listing_limit;
end;
$$;

revoke all on function public.account_listing_limit(text) from public;
revoke all on function public.can_publish_listing(uuid) from public;
grant execute on function public.account_listing_limit(text) to authenticated;
grant execute on function public.can_publish_listing(uuid) to authenticated;

create or replace function public.enforce_listing_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if not public.can_publish_listing(new.seller_id) then
    raise exception 'listing limit reached for this plan' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_listing_limit() from public;

drop trigger if exists enforce_listing_limit_trigger on public.listings;
create trigger enforce_listing_limit_trigger
  before insert on public.listings
  for each row execute function public.enforce_listing_limit();

-- ------------------------------------------------------------
-- 7) Report spam cap: "reports: créer connecté" had no limit, so one
--    account could bury the moderation queue. 20 reports a day is far
--    above honest use.
-- ------------------------------------------------------------
create or replace function public.enforce_report_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if (select count(*) from public.reports
       where reporter_id = new.reporter_id
         and created_at > now() - interval '1 day') >= 20 then
    raise exception 'report rate limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_report_rate_limit() from public;

drop trigger if exists enforce_report_rate_limit_trigger on public.reports;
create trigger enforce_report_rate_limit_trigger
  before insert on public.reports
  for each row execute function public.enforce_report_rate_limit();

-- ------------------------------------------------------------
-- 8) The API roles still held TRUNCATE / TRIGGER / REFERENCES on most
--    tables from the project's original default privileges. The Data API
--    cannot issue those, but no client role should hold them.
-- ------------------------------------------------------------
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

commit;
