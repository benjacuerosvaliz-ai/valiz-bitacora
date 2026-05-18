import { BrandMark } from "@/components/brand-mark";

/**
 * Loading state global. Se muestra mientras Next.js carga el server
 * component de cualquier ruta. Mantiene el chrome (header con marca)
 * para que la transición no sienta como reset.
 *
 * Skeletons sutiles — no muy ruidosos, en tono piedra.
 */
export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Cargando…
        </p>
      </header>

      <section className="px-8 py-24 sm:px-16 sm:py-32">
        <div className="mx-auto max-w-4xl space-y-10">
          <div className="space-y-4">
            <Bar w="w-32" h="h-3" />
            <Bar w="w-3/4" h="h-12" />
            <Bar w="w-1/2" h="h-12" />
          </div>
          <div className="space-y-3 pt-4">
            <Bar w="w-full" h="h-4" />
            <Bar w="w-full" h="h-4" />
            <Bar w="w-5/6" h="h-4" />
          </div>
        </div>
      </section>
    </main>
  );
}

function Bar({ w, h }: { w: string; h: string }) {
  return (
    <div
      className={`${w} ${h} animate-pulse rounded-sm bg-piedra/60`}
      aria-hidden
    />
  );
}
