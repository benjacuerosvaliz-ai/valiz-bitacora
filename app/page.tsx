export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-baseline justify-between border-b border-piedra px-8 py-8 sm:px-16 sm:py-12">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
          Valiz · Bitácora
        </p>
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Sesión 1 · 2026
        </p>
      </header>

      <section className="flex flex-1 items-center justify-center px-8 py-32 sm:px-16">
        <div className="max-w-3xl">
          <p className="mb-8 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
            Próximamente
          </p>
          <h1 className="font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-7xl">
            Bitácora de un objeto que envejece bien.
          </h1>
          <p className="mt-8 font-serif text-xl italic leading-relaxed text-cuero sm:text-2xl">
            La capa viva de Valiz — pronto.
          </p>
        </div>
      </section>

      <footer className="border-t border-piedra px-8 py-6 sm:px-16">
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Cuero, madera y manos chilenas
        </p>
      </footer>
    </main>
  );
}
