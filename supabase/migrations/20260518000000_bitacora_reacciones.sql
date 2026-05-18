-- Reacciones ♥ en bitácoras. Una reacción por usuario por bitácora
-- (toggle: insert si no existe, delete si ya existe).
--
-- Diseño:
-- - Tabla simple sin id propio: PK compuesto (bitacora_id, user_id).
-- - View `bitacora_reaccion_counts` con count por bitácora, security_invoker
--   = false → anon hace UN query barato a la view en vez de leer rows.
-- - RLS: anon SELECT abierto (counts públicos), authenticated INSERT/DELETE
--   solo de su propia fila.

create table public.bitacora_reacciones (
  bitacora_id  uuid not null references public.bitacora_entries(id) on delete cascade,
  user_id      uuid not null references public.user_profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (bitacora_id, user_id)
);

create index idx_bitacora_reacciones_bitacora on public.bitacora_reacciones (bitacora_id);
create index idx_bitacora_reacciones_user on public.bitacora_reacciones (user_id);

alter table public.bitacora_reacciones enable row level security;

-- Cualquiera puede leer reacciones (contadores son públicos)
create policy "Reacciones son públicas"
  on public.bitacora_reacciones for select
  using (true);

-- Solo el dueño puede reaccionar
create policy "Reaccionar solo propio"
  on public.bitacora_reacciones for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Solo el dueño puede quitar su reacción
create policy "Des-reaccionar solo propio"
  on public.bitacora_reacciones for delete
  to authenticated
  using (auth.uid() = user_id);

-- View pública con contadores agregados. security_invoker=false → la view
-- corre con permisos del owner (postgres), así anon hace un query barato
-- sin pagar el costo de evaluar RLS por cada row.
create view public.bitacora_reaccion_counts
with (security_invoker = false) as
select
  bitacora_id,
  count(*) as count
from public.bitacora_reacciones
group by bitacora_id;

grant select on public.bitacora_reaccion_counts to anon, authenticated;
