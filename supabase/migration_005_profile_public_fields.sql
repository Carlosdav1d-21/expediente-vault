-- ============================================================================
-- Migración 005 — Nombre para mostrar y foto de perfil, visibles para todos
--
-- Ejecutar UNA vez en: panel de Supabase -> SQL Editor -> New query -> pegar
-- todo -> Run. Es seguro correrlo más de una vez.
--
-- Hasta ahora display_name/avatar_url vivían en user_metadata (auth.users),
-- que SOLO el propio dueño puede leer desde el cliente -- por eso otros
-- usuarios no podían ver el nombre/foto de nadie más. Se mueven a columnas
-- de `profiles`, que ya es legible por cualquier autenticado.
--
-- La tabla `profiles` ya tiene RLS de UPDATE con "auth.uid() = id" (sin
-- restricción de columna aquí, a diferencia de `role`), así que cada quien
-- puede seguir editando SU nombre/foto sin necesitar una política nueva.
-- ============================================================================

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;

-- Recupera lo que ya se había guardado en user_metadata (p. ej. la foto que
-- subiste antes de esta migración), para no perderlo.
update public.profiles p
set
  display_name = coalesce(p.display_name, u.raw_user_meta_data ->> 'display_name'),
  avatar_url = coalesce(p.avatar_url, u.raw_user_meta_data ->> 'avatar_url')
from auth.users u
where u.id = p.id;
