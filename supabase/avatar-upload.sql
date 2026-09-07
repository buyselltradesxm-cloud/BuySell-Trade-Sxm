-- Photo de profil utilisateur.
-- Ajoute la colonne profiles.avatar_url et le bucket de stockage public
-- "avatars" (une image par utilisateur, dossier = son user id, comme pour
-- listing-photos). Idempotent : peut etre relance sans erreur.

alter table profiles add column if not exists avatar_url text;

-- ------------------------------------------------------------
--  STORAGE  (photo de profil)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars: lecture publique" on storage.objects;
create policy "avatars: lecture publique"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars: upload dossier utilisateur" on storage.objects;
create policy "avatars: upload dossier utilisateur"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- upsert:true depuis le client declenche un update sur l'objet existant,
-- donc il faut aussi une policy update (pas seulement insert/delete).
drop policy if exists "avatars: remplacement proprietaire" on storage.objects;
create policy "avatars: remplacement proprietaire"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: suppression proprietaire" on storage.objects;
create policy "avatars: suppression proprietaire"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
