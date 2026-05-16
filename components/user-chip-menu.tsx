"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const nf = new Intl.NumberFormat("es-CL");

/**
 * Pill flotante arriba a la derecha con menu desplegable. Se renderiza
 * sobre los datos resueltos por el server component padre.
 */
export function UserChipMenu({
  nombre,
  pts,
  pendientes,
  esAdmin,
  handle,
}: {
  nombre: string;
  pts: number;
  pendientes: number;
  esAdmin: boolean;
  handle: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al click fuera o Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div
      ref={menuRef}
      className="fixed right-4 top-4 z-40 flex flex-row-reverse items-start gap-2 sm:right-6 sm:top-6"
    >
      {/* Chip principal: clickable abre menú */}
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-3 rounded-full border border-piedra bg-fondo/85 px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-tinta backdrop-blur-sm transition-colors hover:border-cuero hover:text-cuero"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span>{nombre}</span>
          <span className="text-cuero">{nf.format(pts)} pts</span>
          <span
            className={`text-[8px] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▼
          </span>
        </button>

        {/* Menú desplegable */}
        {open && (
          <nav
            role="menu"
            className="w-56 border border-piedra bg-fondo shadow-[0_8px_30px_rgba(26,26,26,0.08)]"
          >
            <MenuItem href="/yo" onClick={() => setOpen(false)}>
              Tu equipaje
            </MenuItem>
            <MenuItem href="/yo/perfil" onClick={() => setOpen(false)}>
              Editar perfil
            </MenuItem>
            {handle && (
              <MenuItem
                href={`/u/${handle}`}
                onClick={() => setOpen(false)}
              >
                Mi perfil público
              </MenuItem>
            )}
            <MenuItem href="/bitacora" onClick={() => setOpen(false)}>
              Valiz colectivo
            </MenuItem>
            <MenuItem href="/yo/canje" onClick={() => setOpen(false)}>
              Canjear puntos
            </MenuItem>
            {esAdmin && (
              <MenuItem href="/admin" onClick={() => setOpen(false)} accent>
                Admin
                {pendientes > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cuero px-1.5 font-sans text-[9px] text-fondo">
                    {pendientes}
                  </span>
                )}
              </MenuItem>
            )}
            <button
              onClick={logout}
              disabled={signingOut}
              className="flex w-full items-baseline justify-between border-t border-piedra px-4 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla transition-colors hover:bg-tinta hover:text-fondo disabled:opacity-50"
              role="menuitem"
            >
              {signingOut ? "Saliendo…" : "Cerrar sesión"}
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  href,
  onClick,
  accent,
  children,
}: {
  href: string;
  onClick: () => void;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className={`flex items-center justify-between border-b border-piedra px-4 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors hover:bg-tinta hover:text-fondo ${
        accent ? "text-cuero" : "text-tinta"
      }`}
    >
      {children}
    </Link>
  );
}
