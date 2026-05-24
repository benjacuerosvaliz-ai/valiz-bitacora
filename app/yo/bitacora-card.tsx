"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  id: string;
  fotoUrl: string;
  lugar: string | null;
  texto: string | null;
  created_at: string;
  pointsAwarded: number;
};

const nf = new Intl.NumberFormat("es-CL");

export function BitacoraCard({
  id,
  fotoUrl,
  lugar,
  texto,
  created_at,
  pointsAwarded,
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        pointsAwarded > 0
          ? `Borrar bitácora? Reverte los ${pointsAwarded} pts que te dimos.`
          : "Borrar bitácora?",
      )
    )
      return;
    setDeleting(true);
    const res = await fetch(`/api/bitacora/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      alert("No se pudo borrar.");
      return;
    }
    router.refresh();
  }

  return (
    <li className="relative border border-piedra bg-fondo">
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-fondo/85 font-serif text-base text-tinta backdrop-blur-sm transition-colors hover:bg-tinta hover:text-fondo disabled:opacity-30"
        aria-label="Borrar bitácora"
      >
        ×
      </button>
      <Link href={`/bitacora/${id}`} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fotoUrl}
          alt={lugar ?? ""}
          className="aspect-square w-full object-cover"
        />
        <div className="px-4 py-4">
          {lugar && (
            <p className="font-serif text-base italic text-cuero">{lugar}</p>
          )}
          {texto && (
            <p className="mt-2 line-clamp-3 font-serif text-sm leading-relaxed">
              {texto}
            </p>
          )}
          <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
            {new Date(created_at).toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {pointsAwarded > 0 && ` · +$${nf.format(pointsAwarded)}`}
          </p>
        </div>
      </Link>
    </li>
  );
}
