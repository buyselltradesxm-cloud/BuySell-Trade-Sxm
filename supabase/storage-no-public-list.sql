-- Stop anonymous listing of the photo buckets (audit 2026-11-01, verified live:
-- POST /storage/v1/object/list/listing-photos with the publishable key returned
-- every user folder, i.e. every seller's user id and every photo ever uploaded).
--
-- Both buckets are public, so /storage/v1/object/public/... URLs keep working
-- without any SELECT policy. The app never calls list(); uploads use
-- upsert:false, which needs no SELECT. Owners and admins keep SELECT on their
-- own files because Storage's remove() needs SELECT as well as DELETE.

begin;

drop policy if exists "listing_photos_public_read" on storage.objects;
drop policy if exists "listing-photos: lecture publique" on storage.objects;
drop policy if exists "avatars: lecture publique" on storage.objects;

drop policy if exists "photos: lecture proprietaire ou admin" on storage.objects;
create policy "photos: lecture proprietaire ou admin"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('listing-photos', 'avatars')
    and ((storage.foldername(name))[1] = (select auth.uid())::text
         or owner = (select auth.uid())
         or public.is_admin())
  );

-- Self-check: no SELECT policy on these buckets may remain open to anon/public.
do $$
begin
  if exists (select 1 from pg_policies
              where schemaname = 'storage' and tablename = 'objects' and cmd = 'SELECT'
                and (roles && array['public', 'anon']::name[])) then
    raise exception 'a public SELECT policy is still on storage.objects';
  end if;
end $$;

commit;
