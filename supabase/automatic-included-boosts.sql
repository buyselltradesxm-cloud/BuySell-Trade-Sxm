-- Automatic included boosts for paid accounts.
-- Run this in Supabase, then schedule:
--   select public.apply_automatic_included_boosts();
-- daily or hourly. It is idempotent for the current month.

alter table public.listings add column if not exists boost_source text;
alter table public.listings add column if not exists boost_month text;
alter table public.listings add column if not exists boost_plan text;

create or replace function public.included_boost_limit(account_plan text)
returns integer
language sql
stable
as $$
  select case account_plan
    when 'pro-starter' then 1
    when 'pro-business' then 2
    when 'pro-premium' then 5
    when 'pro-elite' then 10
    when 'pro-unlimited' then 20
    else 0
  end
$$;

create or replace function public.apply_automatic_included_boosts()
returns table (
  seller_id uuid,
  account_plan text,
  applied_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_month text := to_char(now(), 'YYYY-MM');
  profile_row record;
  remaining integer;
  listing_row record;
  applied integer;
begin
  for profile_row in
    select p.id, p.account_plan
      from public.profiles p
     where p.account_type = 'business'
       and p.subscription_status = 'active'
       and public.included_boost_limit(p.account_plan) > 0
  loop
    remaining :=
      public.included_boost_limit(profile_row.account_plan)
      - (
        select count(*)::integer
          from public.listings l
         where l.seller_id = profile_row.id
           and l.boost_source = 'included_auto'
           and l.boost_month = current_month
      );

    applied := 0;

    if remaining > 0 then
      for listing_row in
        select id
          from public.listings l
         where l.seller_id = profile_row.id
           and coalesce(l.status, 'active') = 'active'
           and coalesce(l.is_boosted, false) = false
         order by created_at desc
         limit remaining
      loop
        update public.listings
           set is_boosted = true,
               is_featured = true,
               is_pro = true,
               boost_days = 30,
               boost_price_eur = 0,
               boost_price_usd = 0,
               boost_started_at = now(),
               boost_source = 'included_auto',
               boost_month = current_month,
               boost_plan = profile_row.account_plan
         where id = listing_row.id;

        applied := applied + 1;
      end loop;
    end if;

    seller_id := profile_row.id;
    account_plan := profile_row.account_plan;
    applied_count := applied;
    return next;
  end loop;
end;
$$;

grant execute on function public.included_boost_limit(text) to authenticated;
grant execute on function public.apply_automatic_included_boosts() to service_role;
