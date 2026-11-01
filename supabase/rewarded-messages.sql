-- Rewarded video ads unlock extra messages for free accounts.
--
-- A free account may send five messages per listing. In the store apps it can
-- watch a rewarded video ad to send five more for that listing. Google's AdMob
-- servers confirm each completed video to the admob-reward edge function
-- (server-side verification); only that function, running as service role,
-- can record a reward. The phone never grants itself anything.
--
-- Limits: three rewards per listing (20 messages at most) and ten rewards per
-- account per day. Apply after security-hardening-v3.sql; this replaces its
-- enforce_message_rate_limit() and keeps the same throttle and Pro exemption.

create table if not exists public.message_ad_rewards (
  transaction_id text primary key,               -- AdMob's id: a replayed callback is ignored
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id bigint not null references public.listings(id) on delete cascade,
  ad_unit text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists message_ad_rewards_user_listing_idx
  on public.message_ad_rewards (user_id, listing_id);
create index if not exists message_ad_rewards_user_created_idx
  on public.message_ad_rewards (user_id, created_at);

alter table public.message_ad_rewards enable row level security;
revoke all on public.message_ad_rewards from public, anon, authenticated;
grant select, insert on public.message_ad_rewards to service_role;

-- Messages per listing and rewards granted, so the app can tell a user how
-- many sends remain and whether another video is allowed.
create or replace function public.message_ad_reward_status(p_listing_id bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'sent', (select count(*) from public.messages m
              where m.sender_id = auth.uid() and m.listing_id = p_listing_id),
    'rewards', (select count(*) from public.message_ad_rewards r
                 where r.user_id = auth.uid() and r.listing_id = p_listing_id),
    'rewards_today', (select count(*) from public.message_ad_rewards r
                       where r.user_id = auth.uid() and r.created_at > now() - interval '1 day'),
    'per_reward', 5, 'max_per_listing', 3, 'max_per_day', 10
  )
  where auth.uid() is not null;
$$;
revoke all on function public.message_ad_reward_status(bigint) from public, anon;
grant execute on function public.message_ad_reward_status(bigint) to authenticated;

-- Called only by the admob-reward edge function after it has verified
-- Google's signature. Returns 'granted', 'duplicate' or the limit hit.
create or replace function public.grant_message_ad_reward(
  p_transaction_id text, p_user_id uuid, p_listing_id bigint, p_ad_unit text)
returns text language plpgsql security definer set search_path = public as $$
declare
  per_listing integer;
  per_day integer;
begin
  if p_transaction_id is null or length(p_transaction_id) = 0 or length(p_transaction_id) > 200 then
    return 'invalid';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id)
     or not exists (select 1 from public.listings l where l.id = p_listing_id) then
    return 'invalid';
  end if;
  if exists (select 1 from public.message_ad_rewards r where r.transaction_id = p_transaction_id) then
    return 'duplicate';
  end if;

  -- One account at a time, so two callbacks cannot race past the limits.
  perform pg_advisory_xact_lock(hashtext('message_ad_reward'), hashtext(p_user_id::text));

  select count(*)::integer into per_listing from public.message_ad_rewards r
   where r.user_id = p_user_id and r.listing_id = p_listing_id;
  if per_listing >= 3 then return 'listing_limit'; end if;

  select count(*)::integer into per_day from public.message_ad_rewards r
   where r.user_id = p_user_id and r.created_at > now() - interval '1 day';
  if per_day >= 10 then return 'daily_limit'; end if;

  insert into public.message_ad_rewards (transaction_id, user_id, listing_id, ad_unit)
  values (p_transaction_id, p_user_id, p_listing_id, left(coalesce(p_ad_unit, ''), 200))
  on conflict (transaction_id) do nothing;
  return case when found then 'granted' else 'duplicate' end;
end;
$$;
revoke all on function public.grant_message_ad_reward(text, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.grant_message_ad_reward(text, uuid, bigint, text) to service_role;

create or replace function public.enforce_message_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  free_messages integer;
  reward_count integer;
  paid_active boolean;
begin
  -- Service-role / cron writes (auth.uid() is null) and admins are exempt.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  -- Serialize sends by sender and listing so concurrent free-user requests
  -- cannot race past the per-listing limit.
  perform pg_advisory_xact_lock(
    hashtext(new.sender_id::text),
    hashtext(coalesce(new.listing_id::text, 'no-listing'))
  );

  -- Every active paid business tier is unlimited: Starter, Business,
  -- Premium, Elite, and Unlimited. Expired or pending subscriptions are free.
  select (p.account_type = 'business'
      and coalesce(p.subscription_status, '') = 'active'
      and (p.subscription_current_period_end is null
           or p.subscription_current_period_end > now()))
    into paid_active
    from public.profiles p
   where p.id = new.sender_id;

  if not coalesce(paid_active, false) then
    select count(*)::integer
      into free_messages
      from public.messages m
     where m.sender_id = new.sender_id
       and m.listing_id is not distinct from new.listing_id;

    -- Five free messages, plus five for each rewarded video watched.
    select count(*)::integer
      into reward_count
      from public.message_ad_rewards r
     where r.user_id = new.sender_id
       and r.listing_id is not distinct from new.listing_id;

    if free_messages >= 5 + 5 * coalesce(reward_count, 0) then
      raise exception 'free_listing_message_limit_reached'
        using errcode = 'P0001';
    end if;
  end if;

  -- Retain the short-term abuse throttle for all plans.
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
