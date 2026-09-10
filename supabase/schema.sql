-- ============================================================================
-- Expediente Vault — Esquema de base de datos (Supabase / PostgreSQL)
--
-- Ejecutar UNA vez en: panel de Supabase -> SQL Editor -> New query -> pegar
-- todo -> Run.
--
-- Modelo de seguridad: Row Level Security (RLS) en todas las tablas. Cada
-- usuario solo puede leer y escribir SUS filas (auth.uid() = user_id). La
-- "anon key" del frontend no puede saltarse esto.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles: una fila por usuario. Se crea sola al registrarse (trigger abajo).
-- Guarda el "username" visible; el login real es por email sintético.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Perfiles legibles por cualquier usuario autenticado (base para futuras
-- features sociales: comparar gustos, ver reseñas de otros).
drop policy if exists "profiles: select autenticados" on public.profiles;
create policy "profiles: select autenticados"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles: update dueño" on public.profiles;
create policy "profiles: update dueño"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger: al crear un usuario en auth.users, crear su fila en profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- rankings: el "expediente" (ranking personal) de cada usuario.
-- `item` guarda el MediaItem completo tal cual lo devuelve la API unificada.
-- ----------------------------------------------------------------------------
create table if not exists public.rankings (
  user_id     uuid not null references auth.users (id) on delete cascade,
  item_id     text not null,
  item        jsonb not null,
  elo_score   integer not null default 1000,
  comparisons integer not null default 0,
  added_at    timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.rankings enable row level security;

drop policy if exists "rankings: select propio" on public.rankings;
create policy "rankings: select propio"
  on public.rankings for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "rankings: insert propio" on public.rankings;
create policy "rankings: insert propio"
  on public.rankings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "rankings: update propio" on public.rankings;
create policy "rankings: update propio"
  on public.rankings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "rankings: delete propio" on public.rankings;
create policy "rankings: delete propio"
  on public.rankings for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- audit_log: bitácora de acciones sensibles (capa 6).
-- ----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  username   text,
  action     text not null,
  details    text not null default '',
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log: insert propio" on public.audit_log;
create policy "audit_log: insert propio"
  on public.audit_log for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "audit_log: select propio" on public.audit_log;
create policy "audit_log: select propio"
  on public.audit_log for select
  to authenticated
  using (auth.uid() = user_id);

create index if not exists audit_log_user_created_idx
  on public.audit_log (user_id, created_at desc);
