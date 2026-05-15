-- Storage bucket para fotos de bitácora.
--
-- Bucket público (las bitácoras son siempre públicas). Path convention:
--   bitacora-fotos/{user_id}/{uuid}.{ext}
-- La RLS en storage.objects fuerza que cada user solo escriba dentro de
-- su propio prefijo {user_id}/...

insert into storage.buckets (id, name, public)
values ('bitacora-fotos', 'bitacora-fotos', true)
on conflict (id) do nothing;

-- SELECT: público (cualquiera puede ver las fotos, las bitácoras son públicas)
create policy "bitacora-fotos readable by anyone"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'bitacora-fotos');

-- INSERT: solo authenticated, dentro de su propio prefijo {user_id}/
create policy "bitacora-fotos: user uploads to own prefix"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'bitacora-fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: solo el dueño borra sus fotos
create policy "bitacora-fotos: user deletes own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'bitacora-fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
