-- Sistema de referidos: cada user puede compartir su link único.
-- Si alguien compra usando ese link/código, el comprador obtiene 5%
-- de descuento Y el referidor recibe 5% del subtotal en puntos.
--
-- Implementación: pool pre-generado de discount codes en Shopify
-- (REF-XXXX, 5% off, uso ilimitado, 1 vez por cliente). Cada user que
-- pide su link recibe un código del pool sin asignar.
--
-- Detección de venta referida: sync_orders.py lee orders, matchea
-- discount_code contra codigos_referido, y otorga pts al referidor.

create table public.codigos_referido (
  id                       uuid primary key default gen_random_uuid(),
  code                     text unique not null,
  assigned_to_user_id      uuid references public.user_profiles(id) on delete set null,
  assigned_at              timestamptz,
  created_at               timestamptz not null default now()
);

create index idx_codigos_referido_assigned on public.codigos_referido (assigned_to_user_id);
create index idx_codigos_referido_libre on public.codigos_referido (assigned_to_user_id) where assigned_to_user_id is null;

alter table public.codigos_referido enable row level security;
-- Sin policies para anon/authenticated → solo service_role lee/escribe.
-- El user obtiene su propio código vía API route que usa admin client.

-- Cada user puede tener UN código asignado. Constraint:
create unique index idx_codigos_referido_one_per_user
  on public.codigos_referido (assigned_to_user_id)
  where assigned_to_user_id is not null;
