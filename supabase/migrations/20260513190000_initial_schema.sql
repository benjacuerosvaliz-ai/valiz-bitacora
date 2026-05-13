-- Valiz Bitácora — esquema inicial
-- Cinco tablas que mirrorean del dashboard local solo lo necesario para la capa
-- inmersiva: talleristas (humanos), cueros, familias, productos (SKUs) y ventas
-- mensuales por canal. Operacional (in_transit, déficit, etc.) queda fuera.
--
-- Todas las tablas tienen RLS encendido. Las políticas permiten SELECT público
-- (anon + authenticated) — la página inmersiva es de cara abierta. INSERT /
-- UPDATE / DELETE no tiene política para anon: solo el service_role (usado por
-- el script de sync) puede escribir.

-- ============================================================================
-- talleristas
-- ============================================================================
create table public.talleristas (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  role           text not null,
  bio            text,
  portrait_url   text,
  specialties    text[] default '{}',
  display_order  int default 0,
  created_at     timestamptz default now()
);

alter table public.talleristas enable row level security;

create policy "talleristas readable by anyone"
  on public.talleristas for select
  to anon, authenticated
  using (true);

-- ============================================================================
-- cueros
-- ============================================================================
create table public.cueros (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,   -- "EVEREST MIEL" (proveedor)
  display_name   text not null,          -- "Everest Miel"
  description    text,
  origin         text,                   -- "Curtido vegetal · Cuero Market"
  photo_url      text,
  created_at     timestamptz default now()
);

alter table public.cueros enable row level security;

create policy "cueros readable by anyone"
  on public.cueros for select
  to anon, authenticated
  using (true);

-- ============================================================================
-- familias
-- ============================================================================
create table public.familias (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  description     text,
  hours_per_unit  numeric(5,2) default 0,  -- editable; alimenta el contador
  hero_image_url  text,
  display_order   int default 0,
  created_at      timestamptz default now()
);

alter table public.familias enable row level security;

create policy "familias readable by anyone"
  on public.familias for select
  to anon, authenticated
  using (true);

-- ============================================================================
-- productos
-- ============================================================================
create table public.productos (
  id              uuid primary key default gen_random_uuid(),
  sku             text unique not null,          -- "B-M-CAM"
  name            text not null,                 -- "Banano Midi Camel"
  familia_id      uuid references public.familias(id) on delete set null,
  cuero_id        uuid references public.cueros(id) on delete set null,
  tallerista_id   uuid references public.talleristas(id) on delete set null,
  color_valiz     text,
  p2              numeric(5,2) default 0,
  coleccion       text,
  moda            text check (moda in ('MODA', 'CARRYOVER')) default 'CARRYOVER',
  status          text check (status in ('active', 'archived')) default 'active',
  fallado         boolean default false,
  precio          integer default 0,
  shopify_handle  text,
  hero_image_url  text,
  description     text,
  sales_total     integer default 0,             -- denormalizado, lo recalcula el sync
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.productos enable row level security;

-- Solo SKUs activos son visibles desde la página inmersiva.
create policy "productos activos readable by anyone"
  on public.productos for select
  to anon, authenticated
  using (status = 'active');

create index productos_familia_idx     on public.productos(familia_id);
create index productos_tallerista_idx  on public.productos(tallerista_id);
create index productos_cuero_idx       on public.productos(cuero_id);
create index productos_status_idx      on public.productos(status);

-- updated_at automático
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger productos_updated_at
  before update on public.productos
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- ventas_mensuales
-- ============================================================================
create table public.ventas_mensuales (
  sku              text not null,
  month            date not null,            -- primer día del mes: '2026-05-01'
  qty_shopify      integer default 0,
  qty_tienda_cc    integer default 0,
  qty_mercadolibre integer default 0,
  revenue_clp      bigint default 0,
  updated_at       timestamptz default now(),
  primary key (sku, month)
);

alter table public.ventas_mensuales enable row level security;

create policy "ventas readable by anyone"
  on public.ventas_mensuales for select
  to anon, authenticated
  using (true);

create index ventas_month_idx on public.ventas_mensuales(month);
