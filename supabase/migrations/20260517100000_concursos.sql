-- Concursos mensuales: tema + premio + fechas + ganador.
-- Los usuarios postulan una bitácora existente al concurso vigente
-- desde el form de subida o desde el feed.
--
-- Solo un concurso "vigente" a la vez (validar en código: que el
-- inicia_at del nuevo sea >= termina_at del anterior).

create table public.concursos (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,
  titulo                text not null,
  descripcion           text,                    -- qué se busca, el tema
  premio_descripcion    text,                    -- qué gana el ganador
  inicia_at             timestamptz not null,
  termina_at            timestamptz not null,
  ganador_user_id       uuid references public.user_profiles(id) on delete set null,
  ganador_bitacora_id   uuid references public.bitacora_entries(id) on delete set null,
  ganador_anunciado_at  timestamptz,
  created_at            timestamptz not null default now()
);

create index idx_concursos_periodo on public.concursos (inicia_at, termina_at);

alter table public.concursos enable row level security;

-- Cualquiera lee los concursos (públicos)
create policy "concursos legibles"
  on public.concursos for select
  to anon, authenticated
  using (true);

-- INSERT/UPDATE/DELETE solo service_role (admin via API routes)

-- ============================================================================
create table public.concurso_participaciones (
  id            uuid primary key default gen_random_uuid(),
  concurso_id   uuid not null references public.concursos(id) on delete cascade,
  user_id       uuid not null references public.user_profiles(id) on delete cascade,
  bitacora_id   uuid not null references public.bitacora_entries(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (concurso_id, bitacora_id)
);

create index idx_part_concurso on public.concurso_participaciones (concurso_id);
create index idx_part_user on public.concurso_participaciones (user_id);

alter table public.concurso_participaciones enable row level security;

-- Las participaciones son públicas (parte del concurso)
create policy "participaciones legibles"
  on public.concurso_participaciones for select
  to anon, authenticated
  using (true);

-- Cada user solo puede postular sus propias bitácoras
create policy "user postula sus bitacoras"
  on public.concurso_participaciones for insert
  to authenticated
  with check (user_id = auth.uid());

-- Y solo puede borrar sus propias postulaciones
create policy "user retira sus postulaciones"
  on public.concurso_participaciones for delete
  to authenticated
  using (user_id = auth.uid());
