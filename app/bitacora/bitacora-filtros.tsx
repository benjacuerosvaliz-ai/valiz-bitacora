"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export type FiltroOption = { value: string; label: string };

/**
 * Barra de filtros para /bitacora. Form GET hacia la misma ruta —
 * usa el router de Next para preservar scroll y NO recargar layouts.
 * Render del feed es server-side a partir de searchParams.
 */
export function BitacoraFiltros({
  talleristas,
  familias,
  qDefault,
  talleristaDefault,
  familiaDefault,
}: {
  talleristas: FiltroOption[];
  familias: FiltroOption[];
  qDefault: string;
  talleristaDefault: string;
  familiaDefault: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // input controlado para que mostremos lo que se buscó al recargar
  const [q, setQ] = useState(qDefault);

  // Si el usuario navega con back/forward, sincronizamos
  useEffect(() => {
    setQ(qDefault);
  }, [qDefault]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}#feed` : `${pathname}#feed`, {
      scroll: false,
    });
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("q", q.trim());
  }

  const hayFiltros = !!(qDefault || talleristaDefault || familiaDefault);

  return (
    <div className="border-y border-piedra bg-fondo px-6 py-5 sm:px-10 sm:py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* Buscador */}
          <form onSubmit={onSearchSubmit} className="flex-1">
            <label
              htmlFor="bitacora-q"
              className="block font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla"
            >
              Buscar
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="bitacora-q"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Lugar o palabra clave…"
                className="flex-1 border border-piedra bg-fondo px-3 py-2 font-serif text-base text-tinta placeholder:text-niebla focus:border-cuero focus:outline-none"
              />
              <button
                type="submit"
                className="border border-tinta px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
              >
                Buscar
              </button>
            </div>
          </form>

          {/* Select tallerista */}
          <SelectFiltro
            label="Tallerista"
            id="bitacora-tallerista"
            value={talleristaDefault}
            options={talleristas}
            onChange={(v) => updateFilter("tallerista", v)}
          />

          {/* Select familia */}
          <SelectFiltro
            label="Familia"
            id="bitacora-familia"
            value={familiaDefault}
            options={familias}
            onChange={(v) => updateFilter("familia", v)}
          />
        </div>

        {hayFiltros && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
              Filtros activos:
            </p>
            {qDefault && (
              <Chip
                label={`"${qDefault}"`}
                onClear={() => updateFilter("q", "")}
              />
            )}
            {talleristaDefault && (
              <Chip
                label={
                  talleristas.find((t) => t.value === talleristaDefault)
                    ?.label ?? talleristaDefault
                }
                onClear={() => updateFilter("tallerista", "")}
              />
            )}
            {familiaDefault && (
              <Chip
                label={
                  familias.find((f) => f.value === familiaDefault)?.label ??
                  familiaDefault
                }
                onClear={() => updateFilter("familia", "")}
              />
            )}
            <Link
              href={pathname}
              className="ml-2 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero hover:text-tinta"
            >
              Limpiar todo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectFiltro({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: FiltroOption[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col sm:min-w-40">
      <label
        htmlFor={id}
        className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 border border-piedra bg-fondo px-3 py-2 font-serif text-base text-tinta focus:border-cuero focus:outline-none"
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-2 border border-piedra bg-fondo px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-tinta transition-colors hover:border-cuero hover:text-cuero"
    >
      {label}
      <span aria-hidden>×</span>
    </button>
  );
}
