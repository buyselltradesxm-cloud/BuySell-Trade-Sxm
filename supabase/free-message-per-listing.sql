-- Limit free accounts to five messages they send for each listing.
-- Paid, currently active Pro subscriptions are not subject to this cap.
-- Existing short-term anti-spam limits still apply to every account.
-- Run against the linked Supabase project as the database owner.

begin;

create or replace function public.enforce_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  free_messages integer;
  paid_active boolean;
begin
  -- Keep service-role / cron writes and administrators exempt.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  -- Lock this sender/listing pair so simultaneous requests cannot race past
  -- the five-message cap.
  perform pg_advisory_xact_lock(
    hashtext(new.sender_id::text),
    hashtext(coalesce(new.listing_id::text, 'no-listing'))
  );

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

    if free_messages >= 5 then
      raise exception 'free_listing_message_limit_reached'
        using errcode = 'P0001';
    end if;
  end if;

  -- Preserve the existing abuse throttle for free and paid accounts.
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

commit;
