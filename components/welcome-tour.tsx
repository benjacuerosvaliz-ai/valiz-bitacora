"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const nf = new Intl.NumberFormat("es-CL");

/**
 * Welcome tour de 4 pasos para el primer login. Aparece en /u/[handle]
 * cuando el visitante ES el dueño y welcomed_at es null. Al completarse
 * (o cerrarse) marca welcomed_at vía /api/auth/welcomed para no
 * volver a aparecer.
 *
 * Steps:
 *  1. Bienvenida + resumen del equipaje
 *  2. Tu regalo (2.000 + misiones para llegar a 10.000)
 *  3. Tu código de referido
 *  4. Completá tu perfil (form inline: foto + nombre + IG + ciudad)
 *     — al guardar otorga la misión PERFIL_COMPLETO (+$1.000)
 */
type PerfilActual = {
  avatarUrl: string | null;
  displayName: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  city: string | null;
};

export function WelcomeTour({
  nombre,
  piezas,
  horas,
  pies,
  puntosBienvenida,
  referidoCode,
  handle,
  perfilActual,
}: {
  nombre: string;
  piezas: number;
  horas: number;
  pies: number;
  puntosBienvenida: number; // típicamente 2000 (1 pt = $1 CLP)
  referidoCode: string | null;
  handle: string;
  perfilActual: PerfilActual;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  // Estado del form del último step
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    perfilActual.avatarUrl,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState(
    perfilActual.displayName ?? "",
  );
  const [instagram, setInstagram] = useState(
    perfilActual.instagramHandle ?? "",
  );
  const [city, setCity] = useState(perfilActual.city ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const primerNombre = nombre.split(/\s+/)[0];

  async function markWelcomed() {
    try {
      await fetch("/api/auth/welcomed", { method: "POST" });
    } catch {
      // no-op
    }
  }

  async function close() {
    setOpen(false);
    await markWelcomed();
    router.refresh();
  }

  async function copyCode() {
    if (!referidoCode) return;
    try {
      await navigator.clipboard.writeText(referidoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op
    }
  }

  function onAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }

  async function guardarPerfil() {
    setSaveError(null);
    setSaving(true);
    try {
      // 1. Subir foto si hay archivo nuevo
      if (avatarFile) {
        const fd = new FormData();
        fd.append("file", avatarFile);
        const r = await fetch("/api/perfil/avatar", {
          method: "POST",
          body: fd,
        });
        if (!r.ok) {
          const j = await r.json().catch(() => null);
          throw new Error(j?.error ?? "No pude subir la foto.");
        }
      }
      // 2. Update de campos de texto
      const r2 = await fetch("/api/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          city: city.trim() || null,
          instagram_handle: instagram.trim() || null,
          // No tocamos: country, bio, tiktok_handle (los maneja /yo/perfil)
          country: null,
          bio: null,
          tiktok_handle: perfilActual.tiktokHandle ?? null,
        }),
      });
      if (!r2.ok) {
        const j = await r2.json().catch(() => null);
        throw new Error(j?.error ?? "No pude guardar el perfil.");
      }
      // 3. Cerrar modal (el backend ya disparó la misión PERFIL_COMPLETO
      // si tiene avatar + city + ig/tiktok).
      await close();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Algo falló.");
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    {
      tag: "Bienvenida",
      titulo: `Bienvenido a Valiz, ${primerNombre}.`,
      contenido: (
        <div className="space-y-4 font-serif text-lg leading-relaxed text-tinta sm:text-xl">
          {piezas > 0 ? (
            <>
              <p>
                Ya tienes{" "}
                <strong className="italic text-cuero">
                  {nf.format(piezas)} {piezas === 1 ? "pieza" : "piezas"}
                </strong>{" "}
                a tu nombre — eso son{" "}
                <strong className="italic text-cuero">
                  {nf.format(horas)} {horas === 1 ? "hora" : "horas"}
                </strong>{" "}
                de oficio y{" "}
                <strong className="italic text-cuero">
                  {nf.format(pies)} pies²
                </strong>{" "}
                de cuero rescatado.
              </p>
              <p className="font-serif italic text-niebla">
                Acá las vas a ver con sus detalles y vas a contar dónde han
                ido contigo.
              </p>
            </>
          ) : (
            <p>
              Esta es tu bitácora. Acá vas a registrar tus Valiz y los
              lugares por donde van. Cuanto más te involucres, más puntos
              acumulas.
            </p>
          )}
        </div>
      ),
    },
    {
      tag: "Tu regalo",
      titulo: `$${nf.format(puntosBienvenida)} de regalo para empezar.`,
      contenido: (
        <div className="space-y-5">
          <p className="font-serif text-lg leading-relaxed text-tinta sm:text-xl">
            Cada peso se canjea 1 a 1 en{" "}
            <strong className="italic text-cuero">valiz.cl</strong>, en
            compras desde $25.000.
          </p>
          <p className="font-serif text-lg italic text-niebla">
            Y hay hasta $3.000 más completando tu bitácora:
          </p>
          <ul className="space-y-3 border-y border-piedra py-5">
            <Mision
              premio="+$1.000"
              titulo="Completa tu perfil"
              detalle="Foto, Instagram y ciudad. Es el próximo paso."
            />
            <Mision
              premio="+$1.000"
              titulo="Tu primera bitácora con foto y lugar"
              detalle="Después +$200 por cada bitácora extra."
            />
            <Mision
              premio="+$1.000"
              titulo="Presenta tu equipaje"
              detalle="Confirma las piezas Valiz que ya tienes."
            />
          </ul>
          <p className="font-serif text-sm italic text-niebla">
            Después, ganas 5% del subtotal cada vez que un amigo compra
            Valiz con tu código de referido. Sin tope.
          </p>
        </div>
      ),
    },
    {
      tag: "Tu código",
      titulo: referidoCode
        ? `Tu código es ${referidoCode}.`
        : "Tu código de referido.",
      contenido: (
        <div className="space-y-5">
          <p className="font-serif text-lg leading-relaxed text-tinta sm:text-xl">
            Compártelo con quien quieras. Si lo usa, obtiene{" "}
            <strong className="italic text-cuero">15% off</strong> en su
            primera compra Valiz, y tú te llevas{" "}
            <strong className="italic text-cuero">5% del subtotal en pesos</strong>.
          </p>
          {referidoCode ? (
            <button
              type="button"
              onClick={copyCode}
              className="group flex w-full items-center justify-between gap-3 border border-cuero bg-cuero/5 px-5 py-4 transition-colors hover:bg-cuero hover:text-fondo"
            >
              <span className="font-mono text-2xl font-semibold tracking-[0.18em] text-cuero group-hover:text-fondo">
                {referidoCode}
              </span>
              <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero group-hover:text-fondo">
                {copied ? "✓ Copiado" : "Copiar"}
              </span>
            </button>
          ) : (
            <p className="font-serif italic text-niebla">
              Pronto se te asigna uno automáticamente.
            </p>
          )}
          <p className="font-serif text-sm italic text-niebla">
            Tu perfil público también lo muestra grande — quien entre
            puede copiarlo y usarlo directo en valiz.cl.
          </p>
        </div>
      ),
    },
    {
      tag: "Completa tu perfil · +$1.000",
      titulo: "Que se vea tu cara en bitacora.valiz.cl.",
      contenido: (
        <div className="space-y-5">
          <p className="font-serif text-base leading-relaxed text-niebla sm:text-lg">
            Tu perfil público está en{" "}
            <code className="font-mono text-[13px] text-cuero">
              bitacora.valiz.cl/u/{handle}
            </code>
            . Llénalo y te damos{" "}
            <strong className="not-italic text-cuero">$1.000 al toque</strong>.
          </p>

          {/* Avatar uploader */}
          <div className="flex items-center gap-4 border-t border-piedra pt-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-piedra bg-fondo transition-colors hover:border-cuero"
              aria-label="Subir foto de perfil"
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Tu foto"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-serif text-2xl text-niebla group-hover:text-cuero">
                  +
                </span>
              )}
            </button>
            <div>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                Foto de perfil
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 font-serif text-sm italic text-niebla underline transition-colors hover:text-cuero"
              >
                {avatarPreview ? "Cambiar foto" : "Subir tu foto"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onAvatarPick}
              />
            </div>
          </div>

          {/* Inputs de texto */}
          <div className="space-y-4">
            <Campo
              label="Tu nombre"
              placeholder="Como quieres que te lean"
              value={displayName}
              onChange={setDisplayName}
              maxLength={60}
            />
            <Campo
              label="Instagram"
              placeholder="tuusuario (sin el @)"
              value={instagram}
              onChange={setInstagram}
              maxLength={60}
              prefix="@"
            />
            <Campo
              label="Ciudad"
              placeholder="Santiago, Valdivia, etc."
              value={city}
              onChange={setCity}
              maxLength={80}
            />
          </div>

          {saveError && (
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#a83a1f]">
              {saveError}
            </p>
          )}
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-fondo/95 px-5 py-10 backdrop-blur-md sm:px-6"
        >
          <motion.div
            key={step}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl border border-piedra bg-fondo p-7 shadow-[0_20px_60px_rgba(26,26,26,0.12)] sm:p-10"
          >
            {/* Progress dots + Skip */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-6 rounded-full transition-colors ${
                      i <= step ? "bg-cuero" : "bg-piedra"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="font-sans text-[10px] uppercase tracking-[0.22em] text-niebla transition-colors hover:text-tinta disabled:opacity-40"
              >
                {isLast ? "Después" : "Saltar"}
              </button>
            </div>

            {/* Contenido */}
            <div className="mt-7">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                {current.tag}
              </p>
              <h2 className="mt-3 font-serif text-3xl leading-[1.04] tracking-[-0.02em] sm:text-4xl">
                {current.titulo}
              </h2>
              <div className="mt-6">{current.contenido}</div>
            </div>

            {/* Botones */}
            <div className="mt-9 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={isFirst || saving}
                className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla transition-colors hover:text-tinta disabled:opacity-30 disabled:hover:text-niebla"
              >
                ← Atrás
              </button>
              {isLast ? (
                <button
                  type="button"
                  onClick={guardarPerfil}
                  disabled={saving}
                  className="bg-cuero px-7 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-tinta disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Guardar y ganar $1.000 →"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="bg-tinta px-7 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero"
                >
                  Siguiente →
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Mision({
  premio,
  titulo,
  detalle,
}: {
  premio: string;
  titulo: string;
  detalle?: string;
}) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
      <span className="row-span-2 font-serif text-xl font-semibold leading-none text-cuero">
        {premio}
      </span>
      <p className="font-serif text-base text-tinta">{titulo}</p>
      {detalle && (
        <p className="font-serif text-sm italic text-niebla">{detalle}</p>
      )}
    </li>
  );
}

function Campo({
  label,
  placeholder,
  value,
  onChange,
  maxLength,
  prefix,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  prefix?: string;
}) {
  return (
    <label className="block">
      <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
        {label}
      </span>
      <div className="mt-1 flex items-baseline gap-1 border-b border-piedra focus-within:border-cuero">
        {prefix && (
          <span className="font-serif text-lg text-niebla">{prefix}</span>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full bg-transparent py-2 font-serif text-lg text-tinta outline-none placeholder:text-niebla/40"
        />
      </div>
    </label>
  );
}
