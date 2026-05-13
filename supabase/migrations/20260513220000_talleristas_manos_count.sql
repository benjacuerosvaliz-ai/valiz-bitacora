-- Tamaño de equipo por taller (editable, cambia con frecuencia).
-- Roberto/César/David son jefes de taller — manos_count incluye al jefe.

alter table public.talleristas
  add column if not exists manos_count int default 1;

update public.talleristas set manos_count = 5 where name = 'Roberto';
update public.talleristas set manos_count = 5 where name = 'César';
update public.talleristas set manos_count = 3 where name = 'David';
