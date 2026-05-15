-- Valiz Bitácora — sistema de cuentas, puntos y bitácora personal (Fase 1).
--
-- Lo que entra aquí:
--   user_profiles       — perfil + PIN hash + cache de puntos
--   pin_attempts        — rate limit del PIN
--   orders, order_items — espejo de Shopify (sync semanal desde dashboard)
--   compras_manuales    — piezas compradas fuera de Shopify (unverified)
--   user_equipaje       — VIEW que une orders por email match + compras manuales
--   puntos_movimientos  — ledger append-only de puntos
--   bitacora_entries    — fotos/lugares/historia por pieza
--   recompensas_canjes  — canjes hechos vía Shopify Admin API
--
-- Convenciones:
--   • emails siempre lowercase trim (CHECK + sync lo enforza).
--   • RLS encendido en todo. service_role manda; usuarios solo ven lo suyo.
--   • puntos_actuales en user_profiles es CACHE; el ledger es la verdad.
--     Trigger en puntos_movimientos mantiene el cache coherente.

-- ============================================================================
-- user_profiles
-- ============================================================================
create table public.user_profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  email                  text unique not null,
  pin_hash               text,
  display_name           text,
  country                text,
  city                   text,
  bio                    text,
  avatar_url             text,
  puntos_actuales        int not null default 0,
  marketing_optin        boolean not null default false,
  welcomed_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint email_lowercase check (email = lower(email))
);

create index idx_user_profiles_email on public.user_profiles (email);

alter table public.user_profiles enable row level security;

create policy "user reads own profile"
  on public.user_profiles for select
  to authenticated
  using (id = auth.uid());

create policy "user updates own profile"
  on public.user_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- INSERT inicial lo hace el server via service_role (en el callback de
-- magic link). No hay policy de INSERT para authenticated.

-- ============================================================================
-- pin_attempts (rate limiting: 5 fallos / 15 min → lockout)
-- ============================================================================
create table public.pin_attempts (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  success     boolean not null,
  created_at  timestamptz not null default now(),
  constraint pin_attempts_email_lc check (email = lower(email))
);

create index idx_pin_attempts_email_time on public.pin_attempts (email, created_at desc);

alter table public.pin_attempts enable row level security;
-- Solo service_role escribe/lee. Sin policies → no acceso vía anon/auth.

-- ============================================================================
-- orders + order_items (espejo de Shopify)
-- ============================================================================
create table public.orders (
  name                text primary key,                  -- "#5790"
  email               text not null,
  financial_status    text,
  paid_at             timestamptz,
  subtotal_clp        numeric(12,2) default 0,
  shipping_clp        numeric(12,2) default 0,
  discount_clp        numeric(12,2) default 0,
  discount_code       text,
  total_clp           numeric(12,2) default 0,
  currency            text default 'CLP',
  shipping_city       text,
  shipping_province   text,
  shipping_country    text,
  source              text not null default 'shopify',   -- shopify | tienda_cc | mercadolibre
  created_at          timestamptz,                       -- de Shopify
  synced_at           timestamptz not null default now(),
  constraint orders_email_lc check (email = lower(email))
);

create index idx_orders_email on public.orders (email);
create index idx_orders_paid_at on public.orders (paid_at desc);

alter table public.orders enable row level security;

create policy "user reads orders by email match"
  on public.orders for select
  to authenticated
  using (email = (select email from public.user_profiles where id = auth.uid()));

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_name      text not null references public.orders(name) on delete cascade,
  line_index      int not null,
  sku             text,
  lineitem_name   text,
  qty             int not null default 1,
  unit_price_clp  numeric(12,2),
  unique (order_name, line_index)
);

create index idx_order_items_order on public.order_items (order_name);
create index idx_order_items_sku on public.order_items (sku);

alter table public.order_items enable row level security;

create policy "user reads order_items via own orders"
  on public.order_items for select
  to authenticated
  using (
    order_name in (
      select name from public.orders
      where email = (select email from public.user_profiles where id = auth.uid())
    )
  );

-- ============================================================================
-- compras_manuales (piezas compradas fuera del sistema)
-- ============================================================================
create table public.compras_manuales (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.user_profiles(id) on delete cascade,
  sku             text,                  -- opcional si la persona sabe
  familia_slug    text,                  -- referencia suelta a familias.slug
  color_valiz     text,
  descripcion     text,                  -- texto libre si no sabe SKU
  lugar_compra    text,                  -- "Feria de Quinta Normal", etc.
  fecha_compra    date,
  verified        boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_compras_manuales_user on public.compras_manuales (user_id);

alter table public.compras_manuales enable row level security;

create policy "user manages own compras_manuales"
  on public.compras_manuales for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================================
-- user_equipaje (VIEW: orders por email + compras manuales)
-- ============================================================================
-- Vista que el front consume para "tu equipaje". Reconciliación retroactiva
-- automática: cualquier order con email = user.email aparece de una. Si el
-- email cambia (futuro), la vista se recalcula. RLS de las tablas base
-- protege quién ve qué.
create view public.user_equipaje
with (security_invoker = true)
as
select
  up.id as user_id,
  oi.sku,
  o.name as referencia,
  o.paid_at as adquirido_at,
  o.source,
  true as verified
from public.user_profiles up
join public.orders o on o.email = up.email
join public.order_items oi on oi.order_name = o.name
where oi.sku is not null
union all
select
  cm.user_id,
  cm.sku,
  'manual:' || cm.id::text as referencia,
  cm.fecha_compra::timestamptz as adquirido_at,
  'manual' as source,
  cm.verified
from public.compras_manuales cm
where cm.sku is not null;

grant select on public.user_equipaje to authenticated;

-- ============================================================================
-- puntos_movimientos (ledger append-only)
-- ============================================================================
create table public.puntos_movimientos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.user_profiles(id) on delete cascade,
  delta           int not null,                 -- + ganan / - canjean
  motivo          text not null,                -- compra_shopify | bono_bienvenida | bono_familia_nueva | bitacora | canje_descuento | ajuste_admin
  referencia_id   text,                         -- order_name, familia_slug, bitacora_id, etc.
  created_at      timestamptz not null default now()
);

create index idx_puntos_user_time on public.puntos_movimientos (user_id, created_at desc);
create index idx_puntos_motivo_ref on public.puntos_movimientos (user_id, motivo, referencia_id);

alter table public.puntos_movimientos enable row level security;

create policy "user reads own puntos"
  on public.puntos_movimientos for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT solo via service_role (toda escritura de puntos pasa por server route
-- que valida la regla de negocio antes de meter delta).

-- Trigger: mantener user_profiles.puntos_actuales en sync con el ledger.
create function public.fn_actualizar_puntos_cache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
  set puntos_actuales = puntos_actuales + new.delta,
      updated_at = now()
  where id = new.user_id;
  return new;
end;
$$;

create trigger trg_actualizar_puntos_cache
after insert on public.puntos_movimientos
for each row execute function public.fn_actualizar_puntos_cache();

-- ============================================================================
-- bitacora_entries (fotos + lugar + texto por pieza)
-- ============================================================================
create table public.bitacora_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.user_profiles(id) on delete cascade,
  sku             text,                           -- pieza referenciada
  foto_url        text not null,                  -- Supabase Storage path
  lat             numeric(10,7),
  lng             numeric(10,7),
  lugar           text,                           -- legible: "Cajón del Maipo"
  texto           text,
  points_awarded  int not null default 0,
  invalidated     boolean not null default false, -- admin marca como fake
  created_at      timestamptz not null default now()
);

create index idx_bitacora_user_time on public.bitacora_entries (user_id, created_at desc);
-- Para la regla "1 bitácora con puntos por pieza por mes" hacemos range query
-- en created_at (no necesitamos un month_key materializado).
create index idx_bitacora_user_sku_time on public.bitacora_entries (user_id, sku, created_at desc);

alter table public.bitacora_entries enable row level security;

-- Como las bitácoras son siempre públicas, SELECT abierto a anon + auth.
-- INSERT/DELETE solo el dueño. UPDATE solo el dueño (texto/lugar) o admin
-- vía service_role (para invalidated).
create policy "bitacoras readable by anyone (no invalidated)"
  on public.bitacora_entries for select
  to anon, authenticated
  using (invalidated = false);

create policy "user inserts own bitacora"
  on public.bitacora_entries for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user deletes own bitacora"
  on public.bitacora_entries for delete
  to authenticated
  using (user_id = auth.uid());

create policy "user updates own bitacora text"
  on public.bitacora_entries for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================================
-- recompensas_canjes (canjes ejecutados; código Shopify generado)
-- ============================================================================
create table public.recompensas_canjes (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.user_profiles(id) on delete cascade,
  puntos_gastados        int not null check (puntos_gastados > 0),
  monto_clp              int not null,                -- 1 pt = $1 CLP
  shopify_discount_code  text not null,
  shopify_price_rule_id  text,                        -- ref Admin API
  redeemed               boolean not null default false, -- marcado cuando se usa (webhook futuro)
  created_at             timestamptz not null default now()
);

create index idx_canjes_user_time on public.recompensas_canjes (user_id, created_at desc);

alter table public.recompensas_canjes enable row level security;

create policy "user reads own canjes"
  on public.recompensas_canjes for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT solo service_role (la API route llama a Shopify Admin y persiste).

-- ============================================================================
-- updated_at trigger genérico para user_profiles
-- ============================================================================
create function public.fn_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.fn_touch_updated_at();
