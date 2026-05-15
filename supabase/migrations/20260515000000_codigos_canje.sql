-- Tabla de códigos de descuento Shopify pre-generados (Fase 1 simple).
--
-- Flujo de uso:
--   1. Benja genera lotes de códigos en Shopify admin (ej: 50 códigos
--      de $5.000, 50 de $10.000) — códigos únicos no acumulables.
--   2. Carga el lote acá vía /admin/codigos (interfaz) o vía script
--      `scripts/cargar_codigos.py` (a definir).
--   3. Cuando un usuario canjea, fn_redimir_codigo() asigna atómicamente
--      el primer código disponible de esa denominación al user, descuenta
--      puntos y registra en recompensas_canjes.

create table public.codigos_disponibles (
  id                     uuid primary key default gen_random_uuid(),
  code                   text unique not null,
  denominacion_clp       int not null check (denominacion_clp > 0),
  assigned_to_user_id    uuid references public.user_profiles(id) on delete set null,
  assigned_at            timestamptz,
  created_at             timestamptz not null default now()
);

create index idx_codigos_denom_libre
  on public.codigos_disponibles (denominacion_clp, assigned_to_user_id);

alter table public.codigos_disponibles enable row level security;
-- Sin policies públicas — solo service_role lee/escribe.

-- ============================================================================
-- fn_redimir_codigo: canje atómico
-- ============================================================================
-- Reserva un código disponible (FOR UPDATE SKIP LOCKED para race-free),
-- descuenta puntos del user, registra movimiento y canje. Devuelve el
-- código asignado o levanta excepción.
--
-- Errores posibles (codigo SQLSTATE → app):
--   P0001 → puntos insuficientes
--   P0002 → sin stock para esa denominación
create or replace function public.fn_redimir_codigo(
  p_user_id uuid,
  p_denominacion int
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_puntos int;
  v_code_id uuid;
  v_code text;
begin
  if p_denominacion <= 0 then
    raise exception 'denominacion_invalida' using errcode = 'P0003';
  end if;

  -- Verificar saldo (lock fila del user)
  select puntos_actuales into v_user_puntos
  from public.user_profiles
  where id = p_user_id
  for update;

  if v_user_puntos is null then
    raise exception 'user_no_existe' using errcode = 'P0004';
  end if;

  if v_user_puntos < p_denominacion then
    raise exception 'puntos_insuficientes' using errcode = 'P0001';
  end if;

  -- Reservar el primer código libre para esa denominación
  select id, codigos_disponibles.code
    into v_code_id, v_code
  from public.codigos_disponibles
  where denominacion_clp = p_denominacion
    and assigned_to_user_id is null
  order by created_at asc
  for update skip locked
  limit 1;

  if v_code_id is null then
    raise exception 'sin_stock' using errcode = 'P0002';
  end if;

  update public.codigos_disponibles
  set assigned_to_user_id = p_user_id,
      assigned_at = now()
  where id = v_code_id;

  insert into public.recompensas_canjes (
    user_id, puntos_gastados, monto_clp, shopify_discount_code
  )
  values (p_user_id, p_denominacion, p_denominacion, v_code);

  -- El trigger fn_actualizar_puntos_cache decrementa puntos_actuales.
  insert into public.puntos_movimientos (user_id, delta, motivo, referencia_id)
  values (p_user_id, -p_denominacion, 'canje_descuento', v_code);

  return v_code;
end;
$$;

grant execute on function public.fn_redimir_codigo(uuid, int) to service_role;
