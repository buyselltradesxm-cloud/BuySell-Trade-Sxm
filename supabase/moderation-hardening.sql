-- Buy Sell Trade SXM -- moderation hardening (2026-10-03)
-- Run once: supabase db query --linked --file supabase/moderation-hardening.sql
-- Idempotent. One transaction.
begin;

-- Fold accents and case so "Pistolét" matches the keyword "pistolet".
create or replace function public.moderation_fold(p text)
returns text language sql immutable set search_path = public as $$
  select translate(lower(coalesce(p, '')),
    'àáâãäåāăąçćĉċčďèéêëēĕėęěĝğġģĥìíîïĩīĭįĵķĺļľñńņňòóôõöōŏőŕŗřśŝşšţťùúûüũūŭůűųŵýÿŷźżžđħıłøŧŀ',
    'aaaaaaaaacccccdeeeeeeeeegggghiiiiiiiijklllnnnnoooooooorrrssssttuuuuuuuuuuwyyyzzzdhilotl');
$$;

-- Same rules as before (Pro sellers auto-approve; admin-chosen categories and
-- keywords queue a listing), with keyword matching that is harder to dodge:
--   * accents and case are ignored for every keyword;
--   * keywords of 5+ characters also match when the seller splits them with
--     spaces or punctuation ("p.i.s.t.o.l.e.t"). Short keywords keep plain
--     matching: squashing the text would make "gun" match inside "begun".
create or replace function public.compute_listing_moderation_status(
  p_category text, p_title text, p_description text, p_seller_id uuid
) returns text language plpgsql stable security definer set search_path = public as $$
declare
  is_pro   boolean;
  cats     text[];
  kws      text[];
  kw       text;
  folded   text;
  compact  text;
  kw_fold  text;
  kw_comp  text;
begin
  select (account_type = 'business' and coalesce(subscription_status, '') = 'active')
    into is_pro
    from public.profiles
   where id = p_seller_id;
  if coalesce(is_pro, false) then
    return 'approved';   -- Pro sellers are never queued.
  end if;

  select categories, keywords into cats, kws
    from public.moderation_rules where id = true;

  if cats is not null and p_category = any(cats) then
    return 'pending';
  end if;

  folded  := public.moderation_fold(coalesce(p_title, '') || ' ' || coalesce(p_description, ''));
  compact := regexp_replace(folded, '[^a-z0-9]', '', 'g');
  if kws is not null then
    foreach kw in array kws loop
      kw_fold := public.moderation_fold(trim(kw));
      continue when kw_fold = '';
      if strpos(folded, kw_fold) > 0 then
        return 'pending';
      end if;
      kw_comp := regexp_replace(kw_fold, '[^a-z0-9]', '', 'g');
      if length(kw_comp) >= 5 and strpos(compact, kw_comp) > 0 then
        return 'pending';
      end if;
    end loop;
  end if;

  return 'approved';
end;
$$;

-- A listing an admin rejected must not approve itself again when the seller
-- edits it: it goes back to the queue ('pending') for an admin to look at.
-- Everything else is unchanged: non-admins can never write moderation_status,
-- an edit to title/description/category re-runs the rules, and admin edits
-- (approve/reject from the queue) are never overridden.
create or replace function public.set_listing_moderation_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.moderation_status := compute_listing_moderation_status(new.category, new.title, new.description, new.seller_id);
  elsif tg_op = 'UPDATE' and not is_admin() then
    if new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.category is distinct from old.category then
      if old.moderation_status = 'rejected' then
        new.moderation_status := 'pending';
      else
        new.moderation_status := compute_listing_moderation_status(new.category, new.title, new.description, new.seller_id);
      end if;
    else
      new.moderation_status := old.moderation_status;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.moderation_fold(text) from public, anon, authenticated;
revoke all on function public.compute_listing_moderation_status(text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.set_listing_moderation_status() from public, anon, authenticated;

commit;
