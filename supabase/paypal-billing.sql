-- PayPal recurring Pro subscriptions for website checkout.
-- Run once in Supabase SQL Editor. The provider fields stay protected by the
-- profile billing trigger; the webhook Edge Function writes with service role.
alter table public.profiles add column if not exists paypal_subscription_id text;
alter table public.profiles add column if not exists paypal_payer_id text;
alter table public.profiles add column if not exists subscription_provider text;
alter table public.profiles add column if not exists paypal_checkout_started_at timestamptz;

create unique index if not exists profiles_paypal_subscription_id_idx
  on public.profiles (paypal_subscription_id)
  where paypal_subscription_id is not null;

create table if not exists public.paypal_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received',
  error_code text
);
alter table public.paypal_webhook_events enable row level security;
revoke all on public.paypal_webhook_events from anon, authenticated;
grant select, insert, update on public.paypal_webhook_events to service_role;

create or replace function public.protect_profile_billing()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.account_plan := 'personal-free';
    new.subscription_status := null;
    new.stripe_customer_id := null;
    new.stripe_subscription_id := null;
    new.paypal_subscription_id := null;
    new.paypal_payer_id := null;
    new.subscription_provider := null;
    new.paypal_checkout_started_at := null;
    new.subscription_started := null;
    new.subscription_current_period_end := null;
    new.subscription_cancel_at_period_end := false;
    return new;
  end if;
  new.account_plan := old.account_plan;
  new.subscription_status := old.subscription_status;
  new.stripe_customer_id := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.paypal_subscription_id := old.paypal_subscription_id;
  new.paypal_payer_id := old.paypal_payer_id;
  new.subscription_provider := old.subscription_provider;
  new.paypal_checkout_started_at := old.paypal_checkout_started_at;
  new.subscription_started := old.subscription_started;
  new.subscription_current_period_end := old.subscription_current_period_end;
  new.subscription_cancel_at_period_end := old.subscription_cancel_at_period_end;
  return new;
end;
$$;

drop trigger if exists protect_profile_billing_trigger on public.profiles;
create trigger protect_profile_billing_trigger
  before insert or update on public.profiles
  for each row execute function public.protect_profile_billing();

revoke all on function public.protect_profile_billing() from public;
grant execute on function public.protect_profile_billing() to authenticated, service_role;
