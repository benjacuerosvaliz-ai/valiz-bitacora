-- Storage bucket para avatars de perfil.
--
-- Bucket público (los avatars se muestran en perfiles públicos).
-- Path convention:
--   avatars/{user_id}/{uuid}.{ext}
-- RLS en storage.objects fuerza que cada user solo escriba en su prefijo.
-- DELETE permitido al dueño para que pueda cambiar avatar (sobreescribe).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- SELECT: público (los avatars son visibles para todos)
create policy "avatars readable by anyone"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

-- INSERT: solo authenticated dentro de su propio prefijo {user_id}/
create policy "avatars: user uploads to own prefix"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: dueño puede sobreescribir (upsert)
create policy "avatars: user updates own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: solo el dueño borra su avatar
create policy "avatars: user deletes own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
