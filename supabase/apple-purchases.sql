-- Apply with the database owner. Client roles cannot mint or replay purchases.
begin;
-- Explicit grants are required on this project's hardened REST schema.
grant select, update on public.profiles to service_role;
grant select on public.listings to service_role;
create table if not exists public.apple_purchase_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(), attempts integer not null default 1
);
alter table public.apple_purchase_rate_limits enable row level security;
revoke all on public.apple_purchase_rate_limits from public, anon, authenticated;
create or replace function public.consume_apple_rate_limit(p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare attempts_now integer;
begin
  insert into public.apple_purchase_rate_limits(user_id) values(p_user)
  on conflict(user_id) do update set
    attempts = case when apple_purchase_rate_limits.window_start < now() - interval '10 minutes' then 1 else apple_purchase_rate_limits.attempts + 1 end,
    window_start = case when apple_purchase_rate_limits.window_start < now() - interval '10 minutes' then now() else apple_purchase_rate_limits.window_start end
  returning attempts into attempts_now;
  return attempts_now <= 60;
end;
$$;
revoke all on function public.consume_apple_rate_limit(uuid) from public, anon, authenticated;
grant execute on function public.consume_apple_rate_limit(uuid) to service_role;
create table if not exists public.apple_purchase_intents (
  token uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  product_id text not null,
  listing_id bigint references public.listings(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.apple_transactions (
  transaction_id text primary key,
  original_transaction_id text not null,
  token uuid not null references public.apple_purchase_intents(token),
  product_id text not null,
  plan text,
  boost_days integer,
  purchase_date timestamptz not null,
  expires_date timestamptz,
  revoked boolean not null default false,
  signed_date timestamptz not null,
  environment text not null check(environment in ('Production','Sandbox'))
);
create index if not exists apple_transactions_token on public.apple_transactions(token);
alter table public.apple_purchase_intents enable row level security;
alter table public.apple_transactions enable row level security;
revoke all on public.apple_purchase_intents, public.apple_transactions from public, anon, authenticated;
grant all on public.apple_purchase_intents, public.apple_transactions to service_role;

-- Keep web billing independent: an Apple expiry may only clear a profile
-- that is currently backed by one of this user's Apple transactions.
alter table public.profiles add column if not exists apple_transaction_id text;
create or replace function public.protect_apple_billing_column()
returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' or coalesce(auth.role(), '') = 'anon' then
    if tg_op = 'INSERT' then new.apple_transaction_id := null;
    else new.apple_transaction_id := old.apple_transaction_id; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_apple_billing_column on public.profiles;
create trigger protect_apple_billing_column before insert or update on public.profiles
  for each row execute function public.protect_apple_billing_column();

create or replace function public.reconcile_apple_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare active_tx public.apple_transactions;
begin
  -- Serialize webhook, restore, and checkout updates for the same user.
  perform 1 from public.profiles where id = p_user for update;
  select t.* into active_tx from public.apple_transactions t
    join public.apple_purchase_intents i on i.token = t.token
    where i.user_id = p_user and t.plan is not null and not t.revoked and t.expires_date > now()
    order by t.purchase_date desc, t.signed_date desc limit 1;
  if found then
    update public.profiles set account_type = 'business', account_plan = active_tx.plan,
      subscription_status = 'active', subscription_started = active_tx.purchase_date,
      subscription_current_period_end = active_tx.expires_date,
      apple_transaction_id = active_tx.transaction_id
      where id = p_user;
  else
    update public.profiles set subscription_status = 'inactive', account_plan = 'personal-free',
      apple_transaction_id = null, subscription_current_period_end = now()
      where id = p_user and apple_transaction_id is not null;
  end if;
end;
$$;

create or replace function public.apply_apple_transaction(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare intent public.apple_purchase_intents; active_boost record;
begin
  select * into intent from public.apple_purchase_intents where token = (p->>'token')::uuid for update;
  if not found then raise exception 'purchase intent not found'; end if;
  if intent.user_id is null then return jsonb_build_object('deleted', true); end if;
  if (p->>'plan') is null and intent.product_id <> p->>'product_id' then raise exception 'product mismatch'; end if;
  if (p->>'plan') is not null and intent.product_id not like '%pro_%_monthly' then raise exception 'product mismatch'; end if;
  if exists(select 1 from public.apple_transactions where transaction_id = p->>'transaction_id' and token <> intent.token) then
    raise exception 'transaction ownership mismatch';
  end if;
  insert into public.apple_transactions(transaction_id, original_transaction_id, token, product_id,
    plan, boost_days, purchase_date, expires_date, revoked, signed_date, environment)
  values(p->>'transaction_id', p->>'original_transaction_id', intent.token, p->>'product_id',
    p->>'plan', (p->>'boost_days')::integer, (p->>'purchase_date')::timestamptz,
    (p->>'expires_date')::timestamptz, (p->>'revoked')::boolean, (p->>'signed_date')::timestamptz, p->>'environment')
  on conflict(transaction_id) do update set
    revoked = public.apple_transactions.revoked or excluded.revoked,
    expires_date = excluded.expires_date, signed_date = excluded.signed_date
    where excluded.signed_date >= public.apple_transactions.signed_date;
  perform public.reconcile_apple_user(intent.user_id);
  if intent.listing_id is not null then
    select t.* into active_boost from public.apple_transactions t
      join public.apple_purchase_intents i on i.token = t.token
      where i.listing_id = intent.listing_id and i.user_id = intent.user_id and t.boost_days is not null
        and not t.revoked and t.purchase_date + make_interval(days => t.boost_days) > now()
      order by t.purchase_date + make_interval(days => t.boost_days) desc limit 1;
    if found then
      update public.listings set is_boosted = true, boost_source = 'apple',
        boost_days = active_boost.boost_days, boost_started_at = active_boost.purchase_date
        where id = intent.listing_id and seller_id = intent.user_id;
    else
      update public.listings set is_boosted = false where id = intent.listing_id and boost_source = 'apple';
    end if;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.expire_apple_entitlements()
returns void language plpgsql security definer set search_path = public as $$
declare u record;
begin
  for u in select id from public.profiles where apple_transaction_id is not null
    and subscription_current_period_end <= now()
  loop perform public.reconcile_apple_user(u.id); end loop;
  update public.listings set is_boosted = false where boost_source = 'apple' and is_boosted
    and boost_started_at + make_interval(days => boost_days) <= now();
end;
$$;
revoke all on function public.protect_apple_billing_column(), public.reconcile_apple_user(uuid),
  public.apply_apple_transaction(jsonb), public.expire_apple_entitlements() from public, anon, authenticated;
grant execute on function public.apply_apple_transaction(jsonb), public.expire_apple_entitlements() to service_role;
create extension if not exists pg_cron;
select cron.schedule('expire-apple-entitlements', '* * * * *', 'select public.expire_apple_entitlements()');
commit;
