-- Giorgio Perfumería · fotos de promos y perfumes (Supabase Storage)
--
-- Ejecutar después de schema.sql. Crea el bucket público "productos":
-- cualquiera puede ver las fotos; solo el administrador puede subirlas, cambiarlas o borrarlas.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin sube fotos de productos" on storage.objects;
create policy "admin sube fotos de productos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'productos' and public.is_admin());

drop policy if exists "admin cambia fotos de productos" on storage.objects;
create policy "admin cambia fotos de productos" on storage.objects
  for update to authenticated
  using (bucket_id = 'productos' and public.is_admin())
  with check (bucket_id = 'productos' and public.is_admin());

drop policy if exists "admin borra fotos de productos" on storage.objects;
create policy "admin borra fotos de productos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'productos' and public.is_admin());
