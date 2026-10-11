-- ============================================================
--  Buy Sell Trade Sxm — Pro plans granted by an admin, with an end date
--  Run in: Supabase Dashboard > SQL Editor > New query > paste all > Run
--  Idempotent — safe to re-run. Run AFTER protect-paid-columns.sql and
--  security-hardening-v3.sql.
--
--  WHY: the launch offer gives the first businesses a Pro plan for a
--  few months without payment. Setting subscription_status = 'active'
--  by hand would never end on the server: only can_publish_listing()
--  looks at subscription_current_period_end, while the Pro badge, the
--  moderation fast-path and the included boosts look at the status
--  alone, and nothing but a Stripe or Apple event ever clears it.
--
--  profiles.plan_granted_until marks a plan as granted. The plan is
--  still the granted one for as long as subscription_current_period_end
--  equals that marker: a Stripe or Apple subscription that starts later
--  overwrites the period end, and from then on the grant functions only
--  forget the marker and never touch the paid subscription.
-- ============================================================

begin;

alter table public.profiles add column if not exists plan_granted_until timestamptz;

-- Same rule as protect_profile_billing(): only an admin, or a call with
-- no JWT at all (service role, cron), may move this column.
create or replace function public.protect_plan_grant_column()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.plan_granted_until := null;
  else
    new.plan_granted_until := old.plan_granted_until;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_plan_grant_column_trigger on public.profiles;
create trigger protect_plan_grant_column_trigger
  before insert or update on public.profiles
  for each row execute function public.protect_plan_grant_column();

create or replace function public.admin_grant_plan(target uuid, plan text, months integer)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  ends_at timestamptz;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if plan is null or plan not in ('pro-starter', 'pro-business', 'pro-premium', 'pro-elite', 'pro-unlimited') then
    raise exception 'invalid plan';
  end if;
  if months is null or months < 1 or months > 12 then
    raise exception 'invalid duration';
  end if;

  select * into p from public.profiles where id = target for update;
  if not found then
    raise exception 'profile not found';
  end if;

  -- Never overwrite a subscription someone is paying for.
  if coalesce(p.subscription_status, '') = 'active'
     and (p.subscription_current_period_end is null or p.subscription_current_period_end > now())
     and (p.plan_granted_until is null
          or p.subscription_current_period_end is distinct from p.plan_granted_until) then
    raise exception 'paid subscription active';
  end if;

  ends_at := now() + make_interval(months => months);
  update public.profiles
     set account_type = 'business',
         account_plan = plan,
         subscription_status = 'active',
         subscription_started = now(),
         subscription_current_period_end = ends_at,
         subscription_cancel_at_period_end = false,
         plan_granted_until = ends_at
   where id = target
  returning * into p;

  insert into public.admin_events (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'grant_plan', 'user', target::text,
          jsonb_build_object('plan', plan, 'months', months, 'until', ends_at));
  return p;
end;
$$;

create or replace function public.admin_revoke_granted_plan(target uuid)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  still_granted boolean;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select * into p from public.profiles where id = target for update;
  if not found then
    raise exception 'profile not found';
  end if;
  if p.plan_granted_until is null then
    raise exception 'no granted plan';
  end if;

  still_granted := p.subscription_current_period_end is not distinct from p.plan_granted_until;
  if still_granted then
    update public.profiles
       set subscription_status = 'inactive',
           account_plan = 'personal-free',
           subscription_current_period_end = now(),
           plan_granted_until = null
     where id = target
    returning * into p;
  else
    update public.profiles set plan_granted_until = null where id = target returning * into p;
  end if;

  insert into public.admin_events (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'revoke_granted_plan', 'user', target::text,
          jsonb_build_object('plan_ended', still_granted));
  return p;
end;
$$;

-- Ends granted plans whose date has passed. Returns how many plans ended.
create or replace function public.expire_granted_plans()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  ended integer := 0;
begin
  update public.profiles
     set subscription_status = 'inactive',
         account_plan = 'personal-free',
         plan_granted_until = null
   where plan_granted_until <= now()
     and subscription_current_period_end is not distinct from plan_granted_until;
  get diagnostics ended = row_count;

  -- A paid subscription took over before the grant ran out: keep it.
  update public.profiles set plan_granted_until = null where plan_granted_until <= now();
  return ended;
end;
$$;

revoke all on function public.protect_plan_grant_column() from public, anon, authenticated;
revoke all on function public.admin_grant_plan(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.admin_revoke_granted_plan(uuid) from public, anon, authenticated;
revoke all on function public.expire_granted_plans() from public, anon, authenticated;
grant execute on function public.admin_grant_plan(uuid, text, integer) to authenticated;
grant execute on function public.admin_revoke_granted_plan(uuid) to authenticated;
grant execute on function public.expire_granted_plans() to service_role;

create extension if not exists pg_cron;
select cron.schedule('expire-granted-plans', '*/15 * * * *', 'select public.expire_granted_plans()');

commit;
