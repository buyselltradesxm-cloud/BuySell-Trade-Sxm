-- Server-side publication limits for Buy Sell Trade SXM.
-- Run after schema.sql. Stripe's service-role webhook is responsible for
-- setting subscription_status = 'active' after a real payment.

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
  listing_limit integer;
  used_count integer;
begin
  select * into user_profile from public.profiles where id = user_id;
  if user_profile.id is null then return false; end if;

  listing_limit := public.account_listing_limit(user_profile.account_plan);
  if listing_limit is null then return true; end if;

  if user_profile.account_type = 'business' then
    if coalesce(user_profile.subscription_status, 'inactive') <> 'active' then
      return false;
    end if;

    select count(*) into used_count
      from public.listings
     where seller_id = user_id
       and coalesce(status, 'active') <> 'sold';
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

grant execute on function public.account_listing_limit(text) to authenticated;
grant execute on function public.can_publish_listing(uuid) to authenticated;

drop policy if exists "listings: créer la sienne (connecté)" on public.listings;
create policy "listings: créer la sienne (connecté)"
  on public.listings for insert to authenticated
  with check (
    auth.uid() = seller_id
    and not public.is_banned()
    and public.can_publish_listing(auth.uid())
  );
