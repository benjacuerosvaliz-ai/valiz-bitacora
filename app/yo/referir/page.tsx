import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { ReferirCliente } from "./referir-cliente";

export const metadata: Metadata = {
  title: "Recomendar Valiz · Valiz Bitácora",
};

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("es-CL");

type Movimiento = {
  id: string;
  delta: number;
  referencia_id: string | null;
  created_at: string;
};

type OrderInfo = {
  name: string;
  total_clp: number | string | null;
  paid_at: string | null;
};

export default async function ReferirPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/yo/referir");

  const admin = createAdminClient();

  // Código existente (si tiene)
  const { data: cod } = await admin
    .from("codigos_referido")
    .select("code")
    .eq("assigned_to_user_id", user.id)
    .maybeSingle();
  const codigoInicial = cod?.code ?? null;

  // Historial de pts por referido
  const { data: movsRaw } = await admin
    .from("puntos_movimientos")
    .select("id, delta, referencia_id, created_at")
    .eq("user_id", user.id)
    .eq("motivo", "referido")
    .order("created_at", { ascending: false })
    .limit(50);
  const movs = (movsRaw ?? []) as Movimiento[];

  const totalPtsReferidos = movs.reduce((s, m) => s + m.delta, 0);
  const totalVentas = movs.length;

  // Order detalles para mostrar contexto
  const orderNames = movs
    .map((m) => m.referencia_id)
    .filter(Boolean) as string[];
  let ordersById = new Map<string, OrderInfo>();
  if (orderNames.length > 0) {
    const { data: ords } = await admin
      .from("orders")
      .select("name, total_clp, paid_at")
      .in("name", orderNames);
    ordersById = new Map(
      ((ords ?? []) as OrderInfo[]).map((o) => [o.name, o]),
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/yo" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Recomendar Valiz
        </p>
      </header>

      <section className="flex flex-1 items-start px-8 sm:px-16">
        <div className="mx-auto w-full max-w-2xl py-12 sm:py-20">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Tu link
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.04] tracking-[-0.022em] sm:text-5xl">
            Recomienda Valiz, gana pts.
          </h1>
          <p className="mt-6 max-w-xl font-serif italic leading-relaxed text-niebla">
            Comparte tu link. Quien compre con él se lleva{" "}
            <span className="not-italic font-semibold text-cuero">
              15% de descuento
            </span>{" "}
            en valiz.cl, y tú recibes{" "}
            <span className="not-italic font-semibold text-cuero">
              5% del subtotal en puntos
            </span>{" "}
            para canjear cuando quieras.
          </p>

          <div className="mt-10">
            <ReferirCliente codigoInicial={codigoInicial} />
          </div>

          {/* Stats */}
          {(totalVentas > 0 || totalPtsReferidos > 0) && (
            <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-piedra pt-10">
              <div>
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
                  Ventas referidas
                </p>
                <p className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em]">
                  {nf.format(totalVentas)}
                </p>
              </div>
              <div>
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                  Pts ganados
                </p>
                <p className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-cuero">
                  +{nf.format(totalPtsReferidos)}
                </p>
              </div>
            </div>
          )}

          {/* Historial */}
          {movs.length > 0 && (
            <div className="mt-12">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                Historial
              </p>
              <ul className="mt-6">
                {movs.map((m) => {
                  const ord = m.referencia_id
                    ? ordersById.get(m.referencia_id)
                    : null;
                  return (
                    <li key={m.id} className="border-b border-piedra py-3">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-serif text-base">
                          Venta {m.referencia_id ?? "?"}
                          {ord?.total_clp && (
                            <span className="ml-2 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                              ${nf.format(Number(ord.total_clp))} CLP
                            </span>
                          )}
                        </span>
                        <span className="font-serif text-lg text-cuero">
                          +{nf.format(m.delta)} pts
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p className="mt-12 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
            Los puntos se otorgan cuando detectamos la venta confirmada
            (típicamente al cierre semanal de orders).
          </p>
        </div>
      </section>
    </main>
  );
}
