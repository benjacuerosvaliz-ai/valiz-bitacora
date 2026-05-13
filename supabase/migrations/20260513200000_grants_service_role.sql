-- Valiz Bitácora — grants explícitos
--
-- El nuevo formato de API keys de Supabase (sb_publishable_* / sb_secret_*) no
-- aplica grants automáticos al rol service_role sobre tablas nuevas creadas
-- vía SQL editor. Sin estos GRANTs, los inserts del script de sync fallan con
-- "permission denied" aunque la auth de la key sea correcta.
--
-- Esta migración cierra ese hueco para las tablas actuales y para cualquier
-- tabla futura creada en el schema public.

-- ============================================================================
-- service_role: full access (lo usa el script local sync_valiz.py)
-- ============================================================================
grant all on table public.talleristas       to service_role;
grant all on table public.cueros            to service_role;
grant all on table public.familias          to service_role;
grant all on table public.productos         to service_role;
grant all on table public.ventas_mensuales  to service_role;

-- ============================================================================
-- anon + authenticated: solo SELECT — RLS sigue filtrando vía políticas
-- ============================================================================
grant select on table public.talleristas       to anon, authenticated;
grant select on table public.cueros            to anon, authenticated;
grant select on table public.familias          to anon, authenticated;
grant select on table public.productos         to anon, authenticated;
grant select on table public.ventas_mensuales  to anon, authenticated;

-- ============================================================================
-- Default privileges para tablas futuras en public.*
-- ============================================================================
alter default privileges in schema public
  grant all on tables to service_role;

alter default privileges in schema public
  grant select on tables to anon, authenticated;
