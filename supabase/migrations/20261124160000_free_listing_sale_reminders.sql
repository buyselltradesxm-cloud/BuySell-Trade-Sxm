create or replace function public.enqueue_listing_renewal_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  queued_count integer;
begin
  with due as (
    select l.id, l.seller_id, l.title, u.email,
           p.renewal_emails_enabled, p.unsubscribe_token
      from public.listings l
      join auth.users u on u.id = l.seller_id
      join public.profiles p on p.id = l.seller_id
     where p.account_type = 'personal'
       and coalesce(p.account_plan, 'personal-free') = 'personal-free'
       and coalesce(l.status, 'active') = 'active'
       and coalesce(l.expires_at, l.created_at + interval '30 days') <= now()
       and l.renewal_requested_at is null
     for update of l skip locked
  ), notifications as (
    insert into public.app_notifications (user_id, listing_id, kind, title, body, action_required, metadata)
    select seller_id, id, 'listing_renewal_required', 'Has your item sold?',
           title || ' has been listed for 30 days. Mark it as sold or keep it listed.',
           true, jsonb_build_object('listing_title', title)
      from due
    on conflict (user_id, listing_id, kind) where read_at is null do nothing
    returning id
  ), emails as (
    insert into public.email_queue (user_id, listing_id, recipient_email, template, subject, payload)
    select seller_id, id, email, 'listing-renewal', 'Has your item sold?',
           jsonb_build_object('listing_id', id, 'listing_title', title, 'unsubscribe_token', unsubscribe_token)
      from due
     where email is not null and renewal_emails_enabled
       and not exists (
         select 1 from public.email_queue q
          where q.listing_id = due.id and q.user_id = due.seller_id
            and q.template = 'listing-renewal' and q.created_at > now() - interval '7 days'
       )
    returning id
  )
  update public.listings l
     set renewal_requested_at = now(), renewal_response_at = null
    from due
   where l.id = due.id;

  get diagnostics queued_count = row_count;
  return queued_count;
end;
$$;

create or replace function public.expire_unconfirmed_listings(grace_days integer default 5)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer;
begin
  update public.listings l
     set status = 'expired', expired_at = now()
    from public.profiles p
   where p.id = l.seller_id
     and p.account_type = 'personal'
     and coalesce(p.account_plan, 'personal-free') = 'personal-free'
     and coalesce(l.status, 'active') = 'active'
     and l.renewal_requested_at is not null
     and l.renewal_response_at is null
     and l.renewal_requested_at <= now() - make_interval(days => greatest(grace_days, 1));
  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

revoke execute on function public.enqueue_listing_renewal_reminders() from public, anon, authenticated;
grant execute on function public.enqueue_listing_renewal_reminders() to service_role;
revoke execute on function public.expire_unconfirmed_listings(integer) from public, anon, authenticated;
grant execute on function public.expire_unconfirmed_listings(integer) to service_role;
