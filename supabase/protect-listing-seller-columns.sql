-- ============================================================
--  Buy Sell Trade Sxm — protect listing placement / lifecycle columns
--  Run in: Supabase Dashboard > SQL Editor > New query > paste all > Run
--  Idempotent — safe to re-run. Run AFTER protect-paid-columns.sql.
--
--  WHY (audit 2026-10-21): "listings: modifier la sienne" lets a seller
--  UPDATE any column of their own listing. Boost/pro flags were already
--  pinned by protect_listing_boost_flags, but a seller could still:
--    - rewrite created_at to jump back to the top of every list (all
--      lists sort by created_at), and to dodge the free plan's monthly
--      limit, which counts listings by created_at;
--    - rewrite expires_at / status / renewal fields so a listing never
--      expires, or bring an expired listing back without confirming;
--    - swap photos after approval, since moderation only re-runs on
--      title / description / category changes.
--
--  The trigger below only acts on direct writes from signed-in users
--  (current_user = 'authenticated'). Server functions that run with
--  their owner's rights (confirm_listing_available, apply_stripe_boost,
--  apply_automatic_included_boosts, the expiry crons) and service-role
--  calls are untouched, and admins keep full control.
--
--  Named zz_… so it fires after the other BEFORE triggers on listings
--  (same-event triggers fire in name order) and has the last word over
--  set_listing_defaults and set_listing_moderation_status.
--
--  is_featured is deliberately left writable: the app features every new
--  listing by default (createListing sends feat: true), so "À la une"
--  currently means "recent listings" and pinning it would empty it.
-- ============================================================

create or replace function public.protect_listing_seller_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user <> 'authenticated' or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_at := now();
    new.expires_at := now() + interval '30 days';
    new.expired_at := null;
    new.renewal_requested_at := null;
    new.renewal_response_at := null;
    if coalesce(new.status, 'active') not in ('active', 'sold', 'reserved') then
      new.status := 'active';
    end if;
    return new;
  end if;

  new.id := old.id;
  new.created_at := old.created_at;
  new.expires_at := old.expires_at;
  new.expired_at := old.expired_at;
  new.renewal_requested_at := old.renewal_requested_at;
  new.renewal_response_at := old.renewal_response_at;

  -- Sellers may switch between active / sold / reserved. Leaving
  -- 'expired' goes through confirm_listing_available only.
  if new.status is distinct from old.status
     and (coalesce(old.status, 'active') = 'expired'
          or coalesce(new.status, 'active') not in ('active', 'sold', 'reserved')) then
    new.status := old.status;
  end if;

  -- A photo (or thumbnail) that was not on the approved listing sends it
  -- back to the admin queue. Removing or reordering photos does not.
  -- EXCEPT, not "<> all": one NULL element in the old array makes every
  -- "<> all" comparison NULL, which would let later swaps through.
  if exists (select unnest(coalesce(new.photos, '{}'::text[]))
             except select unnest(coalesce(old.photos, '{}'::text[])))
     or exists (select unnest(coalesce(new.thumb_photos, '{}'::text[]))
                except select unnest(coalesce(old.thumb_photos, '{}'::text[]))) then
    new.moderation_status := 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists zz_protect_listing_seller_columns_trigger on public.listings;
create trigger zz_protect_listing_seller_columns_trigger
  before insert or update on public.listings
  for each row execute function public.protect_listing_seller_columns();

-- ------------------------------------------------------------
--  confirm_listing_available — the only way for a seller to extend a
--  listing now. The live version failed on every call with "column
--  reference listing_id is ambiguous" (the parameter and the
--  app_notifications column share the name), so "still available"
--  never worked and listings expired anyway. Same body as live, with
--  the column qualified.
-- ------------------------------------------------------------
create or replace function public.confirm_listing_available(listing_id bigint)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare updated_listing public.listings;
begin
  update public.listings
     set status = 'active', expires_at = now() + interval '30 days', renewal_response_at = now(), renewal_requested_at = null, expired_at = null
   where id = listing_id and seller_id = auth.uid()
   returning * into updated_listing;
  if updated_listing.id is null then raise exception 'listing not found or not yours'; end if;
  update public.app_notifications set read_at = now()
   where app_notifications.listing_id = confirm_listing_available.listing_id and user_id = auth.uid() and kind = 'listing_renewal_required';
  return updated_listing;
end;
$$;

revoke execute on function public.confirm_listing_available(bigint) from public;
grant execute on function public.confirm_listing_available(bigint) to authenticated;
