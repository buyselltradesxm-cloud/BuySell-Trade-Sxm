-- ============================================================
--  Buy Sell Trade Sxm — paid boosts bought on the website (Stripe)
--  Run in: Supabase Dashboard > SQL Editor > New query > paste all > Run
--  Idempotent — safe to re-run. Run AFTER protect-paid-columns.sql.
--
--  WHY: boosts could only be bought in the iOS app. On the website the
--  button answered "unavailable". The stripe-webhook Edge Function now
--  calls apply_stripe_boost() once Stripe confirms a one-time payment.
--
--  The browser never sets a boost: protect_listing_boost_flags() pins the
--  boost columns for signed-in users, and only the service role (the
--  webhook) can call the function below.
-- ============================================================

create table if not exists public.stripe_boost_purchases (
  session_id        text primary key,           -- Stripe Checkout Session id
  payment_intent_id text,
  user_id           uuid references auth.users(id) on delete set null,
  listing_id        bigint references public.listings(id) on delete set null,
  boost_days        integer not null check (boost_days in (3, 7, 14)),
  amount_total      integer not null,           -- smallest currency unit
  currency          text not null,
  created_at        timestamptz not null default now()
);

-- No policies on purpose: only the service role reads or writes purchases.
alter table public.stripe_boost_purchases enable row level security;
revoke all on public.stripe_boost_purchases from anon, authenticated;
grant select, insert on public.stripe_boost_purchases to service_role;

-- Records one paid Checkout Session and boosts its listing. Safe to call
-- again for the same session (Stripe redelivers events): the second call
-- changes nothing. A boost bought while a Stripe boost is still running
-- extends it instead of restarting it.
-- Returns {ok:true} or {ok:false, reason} for a payment that cannot be
-- applied (listing gone or not the buyer's) so the caller can flag it for a
-- refund instead of retrying forever.
create or replace function public.apply_stripe_boost(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l public.listings;
  days integer := (p->>'boost_days')::integer;
begin
  select * into l from public.listings where id = (p->>'listing_id')::bigint for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'listing_not_found'); end if;
  if l.seller_id is distinct from (p->>'user_id')::uuid then
    return jsonb_build_object('ok', false, 'reason', 'listing_not_owned');
  end if;

  insert into public.stripe_boost_purchases(session_id, payment_intent_id, user_id, listing_id, boost_days, amount_total, currency)
  values (p->>'session_id', p->>'payment_intent_id', l.seller_id, l.id, days, (p->>'amount_total')::integer, p->>'currency')
  on conflict (session_id) do nothing;
  if not found then return jsonb_build_object('ok', true, 'duplicate', true); end if;

  if coalesce(l.is_boosted, false) and l.boost_source = 'stripe'
     and l.boost_started_at + make_interval(days => l.boost_days) > now() then
    update public.listings set boost_days = l.boost_days + days where id = l.id;
  else
    update public.listings
       set is_boosted = true, boost_source = 'stripe', boost_days = days, boost_started_at = now(),
           boost_price_usd = (p->>'amount_total')::numeric / 100, boost_price_eur = null,
           boost_month = null, boost_plan = null
     where id = l.id;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.expire_stripe_boosts()
returns void language sql security definer set search_path = public as $$
  update public.listings set is_boosted = false
   where boost_source = 'stripe' and is_boosted
     and boost_started_at + make_interval(days => boost_days) <= now();
$$;

revoke all on function public.apply_stripe_boost(jsonb), public.expire_stripe_boosts() from public, anon, authenticated;
grant execute on function public.apply_stripe_boost(jsonb), public.expire_stripe_boosts() to service_role;

create extension if not exists pg_cron with schema extensions;
select cron.schedule('expire-stripe-boosts', '*/5 * * * *', 'select public.expire_stripe_boosts()');
