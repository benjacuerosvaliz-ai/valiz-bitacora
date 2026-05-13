-- Horas artesanales por familia (Benja, 2026-05-13)
-- Tiempo por unidad terminada (corte + costura + terminación) según jefe de taller.
-- Editables después desde admin; estos son el baseline acordado.

update public.familias set hours_per_unit = 1.5  where slug = 'mochila-alforja';        -- Roberto
update public.familias set hours_per_unit = 2.0  where slug = 'mochila-alforja-mama';   -- Roberto
update public.familias set hours_per_unit = 1.5  where slug = 'mochila-alforja-chica';  -- Roberto
update public.familias set hours_per_unit = 0.75 where slug = 'banano-midi';            -- Roberto
update public.familias set hours_per_unit = 1.0  where slug = 'cartera-zarga-grande';   -- Roberto
update public.familias set hours_per_unit = 0.3  where slug = 'strap';                  -- Roberto

update public.familias set hours_per_unit = 0.5  where slug = 'banano-grande';          -- César
update public.familias set hours_per_unit = 0.3  where slug = 'banano-chico';           -- César
update public.familias set hours_per_unit = 0.5  where slug = 'mochila-chica';          -- César
update public.familias set hours_per_unit = 0.5  where slug = 'billetera-grande';       -- César
update public.familias set hours_per_unit = 0.75 where slug = 'tabaquera';              -- César
update public.familias set hours_per_unit = 0.3  where slug = 'porta-pasaporte';        -- César
update public.familias set hours_per_unit = 0.3  where slug = 'tarjetero';              -- César

update public.familias set hours_per_unit = 0.4  where slug = 'cinturon-chico';         -- David
