-- ============================================================================
-- Migración 006 — Reseñas escritas (opcionales)
--
-- Ejecutar UNA vez en: panel de Supabase -> SQL Editor -> New query -> pegar
-- todo -> Run. Es seguro correrlo más de una vez.
--
-- La reseña vive en la misma fila del ranking (una por usuario y por ítem).
-- No hace falta política nueva: escribirla ya está limitado al dueño por
-- "rankings: update propio", y leerla es igual que leer el ranking (abierto a
-- cualquier autenticado por "rankings: select comunidad").
-- ============================================================================

alter table public.rankings add column if not exists review text;
alter table public.rankings add column if not exists reviewed_at timestamptz;

-- El límite también se cumple en la base de datos, no solo en el navegador.
alter table public.rankings drop constraint if exists rankings_review_length;
alter table public.rankings
  add constraint rankings_review_length check (review is null or char_length(review) <= 1000);

-- La fecha de la reseña la pone el servidor: el cliente no la puede falsear
-- (si intenta cambiar reviewed_at sin cambiar la reseña, se conserva la anterior).
create or replace function public.set_reviewed_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.reviewed_at := case when new.review is null then null else now() end;
  elsif new.review is distinct from old.review then
    new.reviewed_at := case when new.review is null then null else now() end;
  else
    new.reviewed_at := old.reviewed_at;
  end if;
  return new;
end;
$$;

drop trigger if exists rankings_set_reviewed_at on public.rankings;
create trigger rankings_set_reviewed_at
  before insert or update on public.rankings
  for each row execute function public.set_reviewed_at();
