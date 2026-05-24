"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Buscador de gente compacto. Filtro in-memory sobre la lista de
 * user_profiles_public ya preloaded en la página del colectivo —
 * sin round trips al server.
 *
 * Match contra: handle, display_name, city. Case-insensitive,
 * tolera acentos básicos.
 */
type Persona = {
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
};

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function BuscadorGente({ personas }: { personas: Persona[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Índice precomputado para que cada keystroke sea barato
  const indexadas = useMemo(
    () =>
      personas
        .filter((p) => !!p.handle) // sin handle no podemos linkear
        .map((p) => ({
          ...p,
          search: normalizar(
            [p.handle, p.display_name, p.city]
              .filter(Boolean)
              .join(" "),
          ),
        })),
    [personas],
  );

  const resultados = useMemo(() => {
    const term = normalizar(q.trim());
    if (term.length < 1) return [];
    return indexadas
      .filter((p) => p.search.includes(term))
      .slice(0, 8);
  }, [q, indexadas]);

  // Cerrar al click fuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Cerrar al navegar (cuando el user toca un resultado)
  function close() {
    setOpen(false);
    setQ("");
  }

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="flex items-center border border-piedra bg-fondo focus-within:border-cuero">
        <span
          aria-hidden
          className="pl-3 font-sans text-[12px] text-niebla"
        >
          ⌕
        </span>
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar persona, ciudad, @handle…"
          className="w-full bg-transparent px-3 py-2 font-serif text-sm outline-none placeholder:text-niebla/60"
        />
      </div>

      {open && q.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[60vh] overflow-y-auto border border-piedra bg-fondo shadow-[0_8px_30px_rgba(26,26,26,0.08)]">
          {resultados.length === 0 ? (
            <p className="px-3 py-3 font-serif text-sm italic text-niebla">
              Sin resultados para “{q}”.
            </p>
          ) : (
            <ul role="listbox">
              {resultados.map((p) => (
                <li key={p.handle}>
                  <Link
                    href={`/u/${p.handle}`}
                    onClick={close}
                    className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-tinta/[0.04]"
                  >
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatar_url}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full border border-piedra object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cuero font-serif text-sm text-fondo">
                        {(p.display_name ?? p.handle ?? "V")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-sm text-tinta">
                        {p.display_name ?? `@${p.handle}`}
                      </p>
                      <p className="truncate font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                        <span className="text-cuero">@{p.handle}</span>
                        {p.city && <span> · {p.city}</span>}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
