-- ============================================================================
-- Migración 003 — Fotos de perfil (Supabase Storage)
--
-- Ejecutar UNA vez en: panel de Supabase -> SQL Editor -> New query -> pegar
-- todo -> Run. Es seguro correrlo más de una vez.
-- ============================================================================

-- Bucket público para avatares. Público = cualquiera con el link puede VER
-- una foto (es solo un avatar, no un dato sensible); subir/reemplazar/borrar
-- sigue restringido por las políticas de abajo.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Cualquiera puede leer avatares.
drop policy if exists "avatars: lectura publica" on storage.objects;
create policy "avatars: lectura publica"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Un usuario autenticado SOLO puede subir/reemplazar/borrar dentro de SU
-- PROPIA carpeta: el primer segmento de la ruta del archivo debe ser su
-- propio user id (la app sube a "<user_id>/avatar.<ext>"). Así nadie puede
-- pisar o borrar la foto de otro usuario aunque conozca su id.
drop policy if exists "avatars: subir propio" on storage.objects;
create policy "avatars: subir propio"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: actualizar propio" on storage.objects;
create policy "avatars: actualizar propio"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: borrar propio" on storage.objects;
create policy "avatars: borrar propio"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
