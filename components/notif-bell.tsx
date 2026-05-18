"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NotifType =
  | "bitacora_reaccion"
  | "compra_validada"
  | "referido_pts"
  | "concurso_ganador"
  | "bitacora_invalidada"
  | "sistema";

export type NotifItem = {
  id: string;
  type: NotifType;
  ref_id: string | null;
  ref_type: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

/**
 * Bell con badge de no leídas + panel dropdown.
 *
 * Polling cada 60s para descubrir notifs nuevas sin recargar. Click en
 * una notif la marca como leída y navega al deep link según `type`.
 * "Marcar todas leídas" usa el endpoint sin body.
 *
 * Tolerante a la ausencia de tabla `notificaciones` (la API devuelve
 * unread=0 e items=[] si la migración no se aplicó).
 */
export function NotifBell({
  initialUnread,
  initialItems,
}: {
  initialUnread: number;
  initialItems: NotifItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotifItem[]>(initialItems);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Cerrar al click fuera o Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
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

  // Polling cada 60s
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/notificaciones", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          items: NotifItem[];
          unread: number;
        };
        if (cancelled) return;
        setItems(data.items);
        setUnread(data.unread);
      } catch {
        // silencioso
      }
    }
    const t = setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  async function markAll() {
    setUnread(0);
    setItems((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
    );
    try {
      await fetch("/api/notificaciones/leer", { method: "POST" });
      router.refresh();
    } catch {
      // optimistic ya aplicado
    }
  }

  async function markOne(id: string) {
    setUnread((u) => Math.max(0, u - 1));
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n,
      ),
    );
    try {
      await fetch("/api/notificaciones/leer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // silencioso
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          unread > 0
            ? `${unread} notificación${unread === 1 ? "" : "es"} sin leer`
            : "Notificaciones"
        }
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-piedra bg-fondo text-tinta transition-colors hover:border-cuero hover:text-cuero"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-cuero px-1 font-sans text-[9px] font-semibold text-fondo">
            {unread > 99 ? "99" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] border border-piedra bg-fondo shadow-[0_8px_30px_rgba(26,26,26,0.08)]"
        >
          <div className="flex items-baseline justify-between border-b border-piedra px-4 py-3">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-tinta">
              Notificaciones
            </p>
            {items.length > 0 && unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-cuero transition-colors hover:text-tinta"
              >
                Marcar leídas
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center font-serif text-sm italic text-niebla">
              No tienes notificaciones aún.
            </p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-piedra overflow-y-auto">
              {items.map((n) => (
                <NotifRow
                  key={n.id}
                  item={n}
                  onClick={() => {
                    if (!n.read_at) markOne(n.id);
                    setOpen(false);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NotifRow({
  item,
  onClick,
}: {
  item: NotifItem;
  onClick: () => void;
}) {
  const { href, title, hint } = describeNotif(item);
  const fecha = relativeDate(item.created_at);
  const content = (
    <div
      className={`flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-tinta/[0.04] ${
        item.read_at ? "" : "bg-fondo"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-serif text-sm leading-tight text-tinta">{title}</p>
        {!item.read_at && (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cuero" aria-hidden />
        )}
      </div>
      {hint && (
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
          {hint}
        </p>
      )}
      <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
        {fecha}
      </p>
    </div>
  );

  if (href) {
    return (
      <li>
        <Link href={href} onClick={onClick} className="block">
          {content}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button type="button" onClick={onClick} className="block w-full text-left">
        {content}
      </button>
    </li>
  );
}

function describeNotif(n: NotifItem): {
  href: string | null;
  title: string;
  hint: string | null;
} {
  const p = n.payload ?? {};
  switch (n.type) {
    case "bitacora_reaccion": {
      const lugar = (p.lugar as string | undefined) ?? "tu bitácora";
      return {
        href: n.ref_id ? `/bitacora/${n.ref_id}` : null,
        title: `A alguien le gustó ${lugar}`,
        hint: "Reacción ♥",
      };
    }
    case "compra_validada": {
      const fam = (p.familia as string | undefined) ?? "Pieza";
      const color = (p.color as string | undefined) ?? null;
      return {
        href: "/yo",
        title: `Validamos tu ${fam}${color ? ` · ${color}` : ""}`,
        hint: "Equipaje confirmado",
      };
    }
    case "referido_pts": {
      const pts = (p.pts as number | undefined) ?? 0;
      return {
        href: "/yo",
        title: `Ganaste ${pts.toLocaleString("es-CL")} pts por referido`,
        hint: "Alguien compró con tu código",
      };
    }
    case "concurso_ganador": {
      const titulo = (p.titulo as string | undefined) ?? "el concurso";
      return {
        href: p.slug ? `/concursos/${p.slug as string}` : "/concursos",
        title: `Ganaste ${titulo}`,
        hint: "Concurso · Ganador",
      };
    }
    case "bitacora_invalidada": {
      return {
        href: "/yo",
        title: "Una de tus bitácoras fue invalidada",
        hint: (p.motivo as string | undefined) ?? "Revisa tu equipaje",
      };
    }
    case "sistema":
    default: {
      const msg = (p.mensaje as string | undefined) ?? "Aviso de Valiz";
      return {
        href: (p.href as string | undefined) ?? null,
        title: msg,
        hint: null,
      };
    }
  }
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diffSec = (Date.now() - d.getTime()) / 1000;
  if (diffSec < 60) return "Ahora";
  if (diffSec < 3600) return `Hace ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `Hace ${Math.floor(diffSec / 3600)} h`;
  if (diffSec < 7 * 86400) return `Hace ${Math.floor(diffSec / 86400)} d`;
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
