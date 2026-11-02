-- Apply after security-fixes-2026-11.sql and the profile billing guards.
-- One server-timed, non-renewable 45-day trial per verified auth account.
begin;
alter table public.profiles add column if not exists pro_trial_started_at timestamptz;
create table if not exists public.pro_trial_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now()
);
alter table public.pro_trial_claims enable row level security;
revoke all on public.pro_trial_claims from public, anon, authenticated;

create or replace function public.apply_business_launch_trial()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare trial_start timestamptz;
begin
  -- Never trust a timestamp supplied by the browser, even on INSERT/upsert.
  select started_at into trial_start from public.pro_trial_claims where user_id = new.id;
  new.pro_trial_started_at := trial_start;
  -- UPSERT fires BEFORE INSERT even when it will update an existing row.
  -- Defer claiming until the UPDATE sees the stored billing entitlement.
  if tg_op = 'INSERT' and exists(select 1 from public.profiles where id = new.id) then return new; end if;
  if new.account_type is distinct from 'business' or trial_start is not null then return new; end if;
  if not exists (select 1 from auth.users where id = new.id and email_confirmed_at is not null) then return new; end if;
  -- Existing paid or admin-granted access is not changed or consumed.
  if coalesce(new.subscription_status,'') = 'active'
     and (new.subscription_current_period_end is null or new.subscription_current_period_end > now()) then return new; end if;
  -- A lapsed paid subscription must not be overwritten by a launch trial.
  if new.stripe_subscription_id is not null or new.paypal_subscription_id is not null
     or new.subscription_provider is not null then return new; end if;
  insert into public.pro_trial_claims(user_id) values(new.id)
    on conflict(user_id) do nothing returning started_at into trial_start;
  if trial_start is null then
    select started_at into trial_start from public.pro_trial_claims where user_id = new.id;
    new.pro_trial_started_at := trial_start;
    return new;
  end if;
  new.pro_trial_started_at := trial_start;
  new.account_plan := 'pro-trial';
  new.subscription_status := 'active';
  new.subscription_started := trial_start;
  new.subscription_current_period_end := trial_start + interval '45 days';
  new.subscription_cancel_at_period_end := true;
  return new;
end;
$$;
revoke all on function public.apply_business_launch_trial() from public, anon, authenticated;
-- PostgreSQL executes BEFORE triggers alphabetically. Billing guards first
-- discard all client-supplied paid fields; this last trigger grants only the
-- fixed launch offer, using the private claim ledger and the server clock.
drop trigger if exists zzzz_business_launch_trial on public.profiles;
create trigger zzzz_business_launch_trial before insert or update on public.profiles
for each row execute function public.apply_business_launch_trial();

create or replace function public.account_listing_limit(plan_name text)
returns integer language sql immutable set search_path = public as $$
select case coalesce(plan_name,'personal-free')
when 'personal-free' then 5 when 'pro-trial' then 20
when 'pro-starter' then 10 when 'pro-business' then 30
when 'pro-premium' then 75 when 'pro-elite' then 150
when 'pro-unlimited' then null else 5 end;
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

  if user_profile.account_type = 'business' and not pro_active then return false; end if;

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



do $$
declare u uuid := gen_random_uuid(); paid uuid := gen_random_uuid(); p public.profiles; trial_end timestamptz;
begin
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
    values(u,'trial-'||u||'@example.invalid',now(),'{"name":"Trial QA"}'::jsonb),
          (paid,'paid-'||paid||'@example.invalid',now(),'{"name":"Paid QA"}'::jsonb);
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  -- Mirrors the browser upsert (BEFORE INSERT followed by BEFORE UPDATE).
  insert into public.profiles(id,account_type) values(u,'business')
    on conflict(id) do update set account_type=excluded.account_type;
  select * into p from public.profiles where id=u;
  if p.account_plan <> 'pro-trial' or p.subscription_status <> 'active'
    or p.subscription_current_period_end - p.pro_trial_started_at <> interval '45 days'
    or public.account_listing_limit(p.account_plan) <> 20 then raise exception 'trial activation failed'; end if;
  if not public.can_publish_listing(u) then raise exception 'trial cannot publish'; end if;
  trial_end := p.subscription_current_period_end;
  update public.profiles set account_plan='pro-unlimited',subscription_current_period_end=now()+interval '2 years',
    pro_trial_started_at=now()+interval '1 year' where id=u;
  select * into p from public.profiles where id=u;
  if p.account_plan <> 'pro-trial' or p.subscription_current_period_end <> trial_end
    or p.pro_trial_started_at <> trial_end-interval '45 days' then raise exception 'client extended trial'; end if;
  if (select count(*) from public.pro_trial_claims where user_id=u) <> 1 then raise exception 'duplicate trial claim'; end if;
  if has_table_privilege('authenticated','public.pro_trial_claims','INSERT')
    or has_table_privilege('authenticated','public.pro_trial_claims','UPDATE')
    or has_table_privilege('authenticated','public.pro_trial_claims','DELETE') then raise exception 'claim ledger writable'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  update public.profiles set subscription_current_period_end=now()-interval '1 second' where id=u;
  perform set_config('request.jwt.claim.sub',u::text,true);
  update public.profiles set account_type='personal' where id=u;
  update public.profiles set account_type='business' where id=u;
  if public.can_publish_listing(u) then raise exception 'expired trial can publish'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  update public.profiles set account_type='business',account_plan='pro-business',subscription_status='active',
    subscription_provider='stripe',subscription_current_period_end=now()+interval '30 days' where id=paid;
  perform set_config('request.jwt.claim.sub',paid::text,true);
  update public.profiles set account_type='business' where id=paid;
  select * into p from public.profiles where id=paid;
  if p.account_plan <> 'pro-business' or p.pro_trial_started_at is not null then raise exception 'paid plan overwritten'; end if;
end;
$$;
select 'PASS: 45-day activation, 20 offers, publish access, tamper protection, single claim, expiry and paid-plan preservation' as trial_checks;
rollback;

