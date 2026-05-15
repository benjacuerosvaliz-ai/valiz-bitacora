-- Email alternativo: una cuenta Valiz puede vincular múltiples correos
-- para que la reconciliación retroactiva alcance compras hechas con
-- distintos emails a lo largo del tiempo.

-- 1. Array de emails secundarios en user_profiles
alter table public.user_profiles
  add column if not exists secondary_emails text[] not null default '{}';

-- 2. Re-crear view user_equipaje considerando email primary + secondarios
drop view if exists public.user_equipaje;

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
join public.orders o
  on (o.email = up.email or o.email = ANY(up.secondary_emails))
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

-- 3. RLS policy de orders: ahora también lee si el email está en secondary_emails
drop policy if exists "user reads orders by email match" on public.orders;
create policy "user reads orders by email match"
  on public.orders for select
  to authenticated
  using (
    email = (select email from public.user_profiles where id = auth.uid())
    or email = ANY(
      (select secondary_emails from public.user_profiles where id = auth.uid())
    )
  );

drop policy if exists "user reads order_items via own orders" on public.order_items;
create policy "user reads order_items via own orders"
  on public.order_items for select
  to authenticated
  using (
    order_name in (
      select name from public.orders
      where email = (select email from public.user_profiles where id = auth.uid())
         or email = ANY(
           (select secondary_emails from public.user_profiles where id = auth.uid())
         )
    )
  );

-- 4. Tabla email_verifications (códigos de 6 dígitos al alt-email)
create table if not exists public.email_verifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.user_profiles(id) on delete cascade,
  email       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  used        boolean not null default false,
  attempts    int not null default 0,
  created_at  timestamptz not null default now(),
  constraint ev_email_lc check (email = lower(email))
);

create index if not exists idx_ev_user_email
  on public.email_verifications (user_id, email, used, expires_at);
create index if not exists idx_ev_user_recent
  on public.email_verifications (user_id, created_at desc);

alter table public.email_verifications enable row level security;
-- Sin policies públicas — solo service_role usa esta tabla.
