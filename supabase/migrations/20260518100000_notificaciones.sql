-- Notificaciones in-app. Cada user tiene su buzón privado con eventos
-- relevantes: alguien reaccionó a su bitácora, admin validó su compra,
-- recibió pts por referido, ganó un concurso.
--
-- Diseño:
-- - Tipo `type` discrimina la naturaleza del evento (controlado por la app)
-- - `ref_id` y `ref_type` apuntan a la entidad asociada (bitacora, order, etc)
--   para deep-linking desde el panel
-- - `payload jsonb` para datos adicionales (snapshot por si la entidad
--   referenciada cambia o se borra)
-- - `read_at` null hasta que el user lo marca como leído
-- - RLS: user solo ve y modifica sus propias notificaciones; service_role
--   las crea desde server (los triggers/APIs usan admin client)

create type public.notif_type as enum (
  'bitacora_reaccion',
  'compra_validada',
  'referido_pts',
  'concurso_ganador',
  'bitacora_invalidada',
  'sistema'
);

create table public.notificaciones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.user_profiles(id) on delete cascade,
  type        public.notif_type not null,
  ref_id      text,
  ref_type    text,
  payload     jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index idx_notif_user_unread on public.notificaciones (user_id, read_at) where read_at is null;
create index idx_notif_user_created on public.notificaciones (user_id, created_at desc);

alter table public.notificaciones enable row level security;

-- User solo ve sus notificaciones
create policy "Ver notificaciones propias"
  on public.notificaciones for select
  to authenticated
  using (auth.uid() = user_id);

-- User puede marcar como leídas las suyas (UPDATE read_at)
create policy "Marcar leídas propias"
  on public.notificaciones for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
