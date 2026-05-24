import Link from "next/link";

/**
 * Checklist visible de misiones de onboarding con barra de progreso
 * hacia el cap. Solo se muestra al dueño del perfil.
 *
 * El estado de cada misión viene server-side (consulta a
 * puntos_movimientos) — este componente es UI puro.
 */
const nf = new Intl.NumberFormat("es-CL");

export type MisionesProgresoProps = {
  /** Saldo actual del user en pesos */
  saldo: number;
  /** true si tiene order pagada con su email (welcome $2k vs $1k) */
  esCliente: boolean;
  /** Misiones ya completadas */
  completadas: {
    perfil: boolean;
    bitacora: boolean;
    equipaje: boolean;
  };
};

const WELCOME_CLIENTE = 2000;
const WELCOME_NUEVO = 1000;
const MISION_AMOUNT = 1000;

export function MisionesProgreso({
  saldo,
  esCliente,
  completadas,
}: MisionesProgresoProps) {
  const welcomeAmount = esCliente ? WELCOME_CLIENTE : WELCOME_NUEVO;

  // Cap total alcanzable solo por onboarding (welcome + 3 misiones)
  const cap = welcomeAmount + MISION_AMOUNT * 3;

  // Cuánto del onboarding ya completó
  const ganadoOnboarding =
    welcomeAmount +
    (completadas.perfil ? MISION_AMOUNT : 0) +
    (completadas.bitacora ? MISION_AMOUNT : 0) +
    (completadas.equipaje ? MISION_AMOUNT : 0);

  const todoCompletado =
    completadas.perfil && completadas.bitacora && completadas.equipaje;

  const porcentaje = Math.min(100, Math.round((ganadoOnboarding / cap) * 100));

  // Si ya completó todo el onboarding y su saldo es alto, no es útil
  // mostrar este widget — se reemplaza por una nota celebratoria.
  if (todoCompletado) {
    return (
      <div className="border border-cuero bg-cuero/5 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
              ✓ Llegaste al máximo de bienvenida
            </p>
            <p className="mt-1 font-serif text-base text-tinta sm:text-lg">
              Ahora ganás <strong className="italic text-cuero">+$200</strong>{" "}
              por cada bitácora nueva con foto y lugar.
            </p>
          </div>
          <Link
            href="/yo/bitacora/nueva"
            className="hidden shrink-0 bg-cuero px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-tinta sm:inline-block"
          >
            + Bitácora
          </Link>
        </div>
      </div>
    );
  }

  const falta = cap - ganadoOnboarding;

  return (
    <div className="border border-piedra bg-tinta/[0.02] px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
          Tu camino al regalo completo
        </p>
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
          <span className="font-serif text-base text-tinta">
            ${nf.format(ganadoOnboarding)}
          </span>
          <span className="mx-1">/</span>${nf.format(cap)}
        </p>
      </div>

      {/* Barra */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-piedra">
        <div
          className="h-full rounded-full bg-cuero transition-all duration-500"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      <p className="mt-2 font-serif text-sm italic text-niebla">
        Te faltan{" "}
        <strong className="not-italic text-cuero">${nf.format(falta)}</strong>{" "}
        de regalo por completar.
      </p>

      {/* Checklist */}
      <ul className="mt-3 space-y-1.5">
        <MisionRow
          done
          titulo={esCliente ? "Bienvenida" : "Bienvenida (no-cliente)"}
          monto={welcomeAmount}
          detalle={esCliente ? "Cliente Valiz · ya entregado" : "Ya entregado"}
        />
        <MisionRow
          done={completadas.perfil}
          titulo="Completá tu perfil"
          monto={MISION_AMOUNT}
          detalle="Foto, Instagram y ciudad"
          href={completadas.perfil ? undefined : "/yo/perfil"}
        />
        <MisionRow
          done={completadas.bitacora}
          titulo="Tu primera bitácora"
          monto={MISION_AMOUNT}
          detalle="Foto + lugar + texto (30+ caracteres)"
          href={completadas.bitacora ? undefined : "/yo/bitacora/nueva"}
        />
        <MisionRow
          done={completadas.equipaje}
          titulo="Presentá tu equipaje"
          monto={MISION_AMOUNT}
          detalle={
            completadas.equipaje
              ? "Tus piezas Valiz confirmadas"
              : "Confirma piezas Valiz que ya tenés"
          }
          href={completadas.equipaje ? undefined : "/yo/agregar-pieza"}
        />
      </ul>

      <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
        Saldo total: <span className="text-cuero">${nf.format(saldo)}</span>
      </p>
    </div>
  );
}

function MisionRow({
  done,
  titulo,
  monto,
  detalle,
  href,
}: {
  done: boolean;
  titulo: string;
  monto: number;
  detalle: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-baseline gap-3">
      <span
        aria-hidden
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] leading-none ${
          done
            ? "border-cuero bg-cuero text-fondo"
            : "border-piedra bg-fondo text-niebla group-hover:border-cuero"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`font-serif text-sm ${done ? "text-niebla line-through" : "text-tinta"}`}
        >
          {titulo}{" "}
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-cuero">
            +${nf.format(monto)}
          </span>
        </p>
        <p className="font-serif text-xs italic text-niebla">{detalle}</p>
      </div>
      {href && (
        <span className="shrink-0 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
          →
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <li>
        <Link
          href={href}
          className="group block rounded px-2 py-1 transition-colors hover:bg-tinta/[0.04]"
        >
          {content}
        </Link>
      </li>
    );
  }
  return <li className="px-2 py-1">{content}</li>;
}
