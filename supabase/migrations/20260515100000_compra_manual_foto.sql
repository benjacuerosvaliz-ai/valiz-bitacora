-- Foto obligatoria al agregar pieza manualmente (para que admin pueda
-- validar visualmente que es Valiz real).
alter table public.compras_manuales
  add column if not exists foto_url text;
