-- Handles de redes sociales en el perfil del usuario.
-- Visible en su perfil público para que otros usuarios puedan
-- redirigirse a sus IG/TikTok desde la bitácora colectiva.

alter table public.user_profiles
  add column if not exists instagram_handle text,
  add column if not exists tiktok_handle text;

-- Normalizamos al guardar — quitamos el @ inicial si lo pegan.
-- (El sanitizing lo hacemos en el code; acá solo permitimos el formato).
