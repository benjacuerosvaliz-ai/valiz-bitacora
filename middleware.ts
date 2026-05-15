import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware de Supabase Auth: refresca el access token en cada request
 * para que la sesión no expire mientras el usuario navega. Necesario para
 * que las cookies de auth (`sb-...`) viajen consistentes entre Server
 * Components, Route Handlers y el browser.
 *
 * No protege rutas — eso lo hacen las páginas individuales con guards
 * (ver app/yo/page.tsx).
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Llamada para forzar el refresh; el resultado lo descartamos, la
  // librería ya escribió las cookies via setAll() arriba si correspondía.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Saltar assets estáticos para no entorpecer perf
    "/((?!_next/static|_next/image|favicon.ico|images/|textures/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2|ico|webmanifest)$).*)",
  ],
};
