-- Valiz Bitácora — datos semilla
-- Talleristas (3 humanos reales, datos placeholder hasta que Benja mande las
-- descripciones definitivas) y familias de productos (catálogo cerrado del
-- dashboard, con horas placeholder en 0 — Benja las llena desde admin).

-- ============================================================================
-- talleristas
-- ============================================================================
insert into public.talleristas (name, role, bio, specialties, display_order) values
  (
    'Roberto',
    'Maestro mayor',
    'Placeholder — Benja escribe la bio definitiva.',
    array[
      'Mochila Alforja',
      'Mochila Alforja Mama',
      'Mochila Alforja Chica',
      'Banano Midi',
      'Cartera Zarga Grande',
      'Strap'
    ],
    1
  ),
  (
    'César',
    'Cortador y talabartero',
    'Placeholder — Benja escribe la bio definitiva.',
    array[
      'Banano Chico',
      'Banano Grande',
      'Billetera Grande',
      'Tabaquera',
      'Porta Pasaporte',
      'Mochila Chica',
      'Tarjetero'
    ],
    2
  ),
  (
    'David',
    'Cinturonero',
    'Placeholder — Benja escribe la bio definitiva.',
    array['Cinturon Chico'],
    3
  );

-- ============================================================================
-- familias
-- horas_per_unit = 0 al inicio. Benja las edita por familia desde un admin
-- (o por SQL) cuando tenga el estimado real por taller.
-- ============================================================================
insert into public.familias (slug, name, display_order) values
  ('mochila-alforja',         'Mochila Alforja',         1),
  ('mochila-alforja-mama',    'Mochila Alforja Mama',    2),
  ('mochila-alforja-chica',   'Mochila Alforja Chica',   3),
  ('mochila-grande',          'Mochila Grande',          4),
  ('mochila-chica',           'Mochila Chica',           5),
  ('banano-grande',           'Banano Grande',           6),
  ('banano-midi',             'Banano Midi',             7),
  ('banano-chico',            'Banano Chico',            8),
  ('cartera-zarga-grande',    'Cartera Zarga Grande',    9),
  ('billetera-grande',        'Billetera Grande',       10),
  ('tabaquera',               'Tabaquera',              11),
  ('porta-pasaporte',         'Porta Pasaporte',        12),
  ('tarjetero',               'Tarjetero',              13),
  ('cinturon-chico',          'Cinturon Chico',         14),
  ('strap',                   'Strap',                  15),
  ('estuche',                 'Estuche',                16);
