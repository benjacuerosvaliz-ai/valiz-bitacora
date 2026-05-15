import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { BitacoraForm } from "./form";

export const metadata: Metadata = {
  title: "Nueva bitácora · Valiz",
};

export const dynamic = "force-dynamic";

type EquipajeRow = { sku: string };

export default async function NuevaBitacoraPage({
  searchParams,
}: {
  searchParams: Promise<{ sku?: string }>;
}) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const skuPreSelected = params.sku ?? null;

  // Equipaje del user: solo se puede subir bitácora de piezas que tienes
  const { data: equipajeRaw } = await sb
    .from("user_equipaje")
    .select("sku")
    .order("adquirido_at", { ascending: false });
  const equipaje = (equipajeRaw ?? []) as EquipajeRow[];
  const skus = [...new Set(equipaje.map((e) => e.sku))];

  // Hidratar nombres de familia + color por SKU
  const [pRes, fRes] = await Promise.all([
    skus.length > 0
      ? sb
          .from("productos")
          .select("sku, color_valiz, familia_id")
          .in("sku", skus)
      : Promise.resolve({ data: [] }),
    sb.from("familias").select("id, name"),
  ]);
  const productos = (pRes.data ?? []) as {
    sku: string;
    color_valiz: string | null;
    familia_id: string | null;
  }[];
  const familias = (fRes.data ?? []) as { id: string; name: string }[];
  const familiaById = new Map(familias.map((f) => [f.id, f.name]));

  const piezas = skus.map((sku) => {
    const p = productos.find((x) => x.sku === sku);
    const fam = p?.familia_id ? familiaById.get(p.familia_id) : null;
    const label = `${fam ?? sku}${p?.color_valiz ? ` · ${p.color_valiz}` : ""}`;
    return { sku, label };
  });

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-baseline justify-between border-b border-piedra px-8 py-6 sm:px-16 sm:py-8">
        <Link
          href="/yo"
          className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero hover:text-tinta"
        >
          ← Tu equipaje
        </Link>
      </header>

      <section className="flex flex-1 items-start px-8 sm:px-16">
        <div className="mx-auto w-full max-w-2xl py-16 sm:py-24">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Nueva bitácora
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.04] tracking-[-0.022em] sm:text-5xl">
            Conta dónde fue.
          </h1>
          <p className="mt-6 max-w-xl font-serif italic leading-relaxed text-niebla">
            Subir una foto + lugar + 30 caracteres de historia te da{" "}
            <span className="not-italic font-semibold text-cuero">200 pts</span>
            . Solo cuenta una vez al mes por pieza, así que valen las que
            importan. Tu bitácora aparece pública en el mapa de Valiz.
          </p>

          <div className="mt-10">
            {piezas.length === 0 ? (
              <div className="border border-piedra bg-fondo p-8">
                <p className="font-serif italic text-niebla">
                  Para subir una bitácora necesitas tener al menos una pieza
                  en tu equipaje. Si compraste con otro correo o fuera de
                  valiz.cl,{" "}
                  <Link href="/yo/agregar-pieza" className="text-cuero underline">
                    agrégala aquí
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <BitacoraForm piezas={piezas} skuPreSelected={skuPreSelected} />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
