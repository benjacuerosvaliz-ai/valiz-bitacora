-- Handle público único para identificar perfiles en URLs amigables
-- (`/u/juan-perez` en vez de `/u/uuid-largo`).
--
-- Se auto-genera al crear el user_profile derivándolo del email
-- (parte antes del @ slugificada). Si choca con uno existente, suma
-- sufijo -2, -3, etc.

alter table public.user_profiles
  add column if not exists handle text unique;

create or replace function public.fn_assign_handle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
  candidate text;
  i int := 0;
begin
  if new.handle is not null and new.handle <> '' then
    return new;
  end if;

  base_handle := lower(
    regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]+', '-', 'g')
  );
  base_handle := trim(both '-' from base_handle);
  if base_handle = '' then base_handle := 'usuario'; end if;

  candidate := base_handle;
  while exists (select 1 from public.user_profiles where handle = candidate) loop
    i := i + 1;
    candidate := base_handle || '-' || i::text;
  end loop;

  new.handle := candidate;
  return new;
end;
$$;

drop trigger if exists trg_assign_handle on public.user_profiles;
create trigger trg_assign_handle
  before insert on public.user_profiles
  for each row execute function public.fn_assign_handle();

-- Backfill para usuarios existentes (handle null)
update public.user_profiles
set handle = lower(
  regexp_replace(split_part(email, '@', 1), '[^a-z0-9]+', '-', 'g')
)
where handle is null;

-- VIEW pública con solo los campos seguros para exponer.
-- Usar esta view (NO user_profiles directo) para todo lo público.
-- Postgres RLS es row-level, no column-level: por eso necesitamos
-- una view separada que solo proyecte los campos seguros.
create or replace view public.user_profiles_public
with (security_invoker = false)  -- bypass RLS de user_profiles
as
select
  id,
  handle,
  display_name,
  country,
  city,
  bio,
  instagram_handle,
  tiktok_handle,
  avatar_url,
  created_at
from public.user_profiles
where handle is not null;

grant select on public.user_profiles_public to anon, authenticated;
