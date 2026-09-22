-- ============================================================================
-- Migración 002 — Roles (dev/admin vs usuario normal)
--
-- Ejecutar UNA vez en: panel de Supabase -> SQL Editor -> New query -> pegar
-- todo -> Run. Es seguro correrlo más de una vez (usa IF NOT EXISTS / DROP
-- POLICY IF EXISTS).
-- ============================================================================

-- Columna de rol. Todo usuario nuevo entra como 'user'; el rol 'admin' se
-- asigna a mano (ver el UPDATE al final de este archivo).
alter table public.profiles
  add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

-- IMPORTANTE: la política de UPDATE que ya existe en profiles es
-- "auth.uid() = id" SIN restricción de columna — eso significa que, sin este
-- REVOKE, cualquier usuario podría auto-asignarse role='admin' llamando a
-- supabase.from('profiles').update({role:'admin'}) desde la consola del
-- navegador. Se bloquea la columna a nivel de Postgres (no de RLS), así que
-- ni siquiera una política de UPDATE mal escrita en el futuro podría abrirla
-- por accidente para el rol "authenticated".
revoke update (role) on public.profiles from authenticated;

-- Un admin puede leer la bitácora de TODOS los usuarios, además de la suya
-- propia. Esta política se SUMA (OR) a "audit_log: select propio"; no la
-- reemplaza, así que un usuario normal sigue viendo solo lo suyo.
drop policy if exists "audit_log: select admin" on public.audit_log;
create policy "audit_log: select admin"
  on public.audit_log for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Igual, pero para poder contar el total de ítems rankeados en todo el
-- sistema desde el panel de admin.
drop policy if exists "rankings: select admin" on public.rankings;
create policy "rankings: select admin"
  on public.rankings for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- Asignar el rol de admin a TU cuenta (la que uses para el demo/desarrollo).
-- Reemplaza 'tu_usuario' por tu username real y corre esta línea aparte.
-- ----------------------------------------------------------------------------
-- update public.profiles set role = 'admin' where username = 'tu_usuario';
