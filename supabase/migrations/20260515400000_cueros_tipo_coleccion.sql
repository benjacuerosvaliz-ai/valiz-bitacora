-- Clasificación de cueros: carryover (base permanente) vs moda
-- (colección temporal). Cada cuero pertenece a una colección — los
-- carryover viven en TT (base) o en Mocha Mousse (era moda y se promovió
-- a base por buen rendimiento). Los moda viven en Trigo (actual) o
-- Cobra (colección individual). ROJO fue una colección pasada sin
-- cueros propios — usaba cueros existentes como base.

alter table public.cueros
  add column if not exists tipo text check (tipo in ('carryover', 'moda')) default 'carryover',
  add column if not exists coleccion text;

-- 13 carryover: 12 en TT base + 1 promovido (Mocha Mousse).
update public.cueros set tipo = 'carryover', coleccion = 'TT'
  where display_name in (
    'Café Gastado',
    'Camel',
    'Caramelo',
    'Charol',
    'Crudo',
    'Denim',
    'Miel',
    'Moka',
    'Musgo',
    'Negro',
    'Negro Gastado',
    'Serpiente Negro'
  );

update public.cueros set tipo = 'carryover', coleccion = 'Mocha Mousse'
  where display_name = 'Mocha Mousse';

-- 4 moda: 3 en Trigo (actual) + 1 en Cobra (individual).
update public.cueros set tipo = 'moda', coleccion = 'Trigo'
  where display_name in ('Trigo Camel', 'Trigo Chocolate', 'Trigo Crudo');

update public.cueros set tipo = 'moda', coleccion = 'Cobra'
  where display_name = 'Cobra';
