-- Allows a signed-in seller to edit only their own listing.
-- Safe to run multiple times on an existing Supabase project.

drop policy if exists "listings: modifier la sienne" on public.listings;
create policy "listings: modifier la sienne"
  on public.listings for update to authenticated
  using (auth.uid() = seller_id and not public.is_banned())
  with check (auth.uid() = seller_id and not public.is_banned());
