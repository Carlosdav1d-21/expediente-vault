-- ============================================================================
-- Migración 004 — Rankings visibles para toda la comunidad
--
-- Ejecutar UNA vez en: panel de Supabase -> SQL Editor -> New query -> pegar
-- todo -> Run. Es seguro correrlo más de una vez.
--
-- Cambio de alcance deliberado: hasta ahora `rankings` solo era legible por
-- su dueño (y por un admin). Esta política SUMA (no reemplaza) el permiso
-- de LECTURA para que cualquier usuario autenticado vea el expediente de
-- todos — como en Letterboxd. Las escrituras (insert/update/delete) siguen
-- restringidas a "auth.uid() = user_id": nadie puede tocar el ranking de
-- otro, solo verlo.
-- ============================================================================

drop policy if exists "rankings: select comunidad" on public.rankings;
create policy "rankings: select comunidad"
  on public.rankings for select
  to authenticated
  using (true);
