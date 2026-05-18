import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AvatarUpload } from "@/components/avatar-upload";
import { BrandMark } from "@/components/brand-mark";
import { getPhotoBySku } from "@/lib/product-photos";
import { createClient } from "@/lib/supabase/server";

import { PerfilForm } from "./perfil-form";

export const metadata: Metadata = {
  title: "Tu perfil · Valiz Bitácora",
};

export const dynamic = "force-dynamic";

type EquipajeRow = { sku: string; source: string };
type ProductoRow = {
  sku: string;
  color_valiz: string | null;
  familia_id: string | null;
};
type FamiliaRow = { id: string; slug: string; name: string };

export default async function PerfilPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("user_profiles")
    .select(
      "email, display_name, country, city, bio, instagram_handle, tiktok_handle, avatar_url",
    )
    .eq("id", user.id)
    .single();

  // Equipaje del user — para mostrar como medallas/thumbnails
  const { data: equipajeRaw } = await sb
    .from("user_equipaje")
    .select("sku, source")
    .order("adquirido_at", { ascending: false });
  const equipaje = (equipajeRaw ?? []) as EquipajeRow[];
  const skus = [...new Set(equipaje.map((e) => e.sku))];

  let productos: ProductoRow[] = [];
  let familias: FamiliaRow[] = [];
  if (skus.length > 0) {
    const [pRes, fRes] = await Promise.all([
      sb
        .from("productos")
        .select("sku, color_valiz, familia_id")
        .in("sku", skus),
      sb.from("familias").select("id, slug, name"),
    ]);
    productos = (pRes.data ?? []) as ProductoRow[];
    familias = (fRes.data ?? []) as FamiliaRow[];
  }
  const productoBySku = new Map(productos.map((p) => [p.sku, p]));
  const familiaById = new Map(familias.map((f) => [f.id, f]));
  const photoBySku = getPhotoBySku();

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/yo" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Perfil personal
        </p>
      </header>

      <section className="flex flex-1 items-start px-8 sm:px-16">
        <div className="mx-auto w-full max-w-xl py-12 sm:py-20">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Tu perfil
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.04] tracking-[-0.022em] sm:text-5xl">
            Cómo te ven los demás.
          </h1>
          <p className="mt-6 font-serif italic leading-relaxed text-niebla">
            Tu correo es <strong>{profile?.email}</strong> (no se puede
            cambiar acá). El nombre que pongas es lo que aparece en tus
            bitácoras públicas.
          </p>

          {/* Avatar arriba del form (es lo primero que se ve) */}
          <div className="mt-10 border-y border-piedra py-6">
            <AvatarUpload
              initialUrl={profile?.avatar_url ?? null}
              initialName={
                profile?.display_name ?? profile?.email?.split("@")[0] ?? "V"
              }
            />
          </div>

          <div className="mt-10">
            <PerfilForm
              initial={{
                display_name: profile?.display_name ?? "",
                country: profile?.country ?? "",
                city: profile?.city ?? "",
                bio: profile?.bio ?? "",
                instagram_handle: profile?.instagram_handle ?? "",
                tiktok_handle: profile?.tiktok_handle ?? "",
              }}
            />
          </div>

          {/* Tus Valiz como medallas */}
          {equipaje.length > 0 && (
            <div className="mt-16 border-t border-piedra pt-10">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                Tus Valiz
              </p>
              <p className="mt-2 font-serif italic leading-relaxed text-niebla">
                {equipaje.length === 1
                  ? "Una pieza a tu nombre."
                  : `${equipaje.length} piezas a tu nombre.`}
              </p>
              <ul className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4">
                {equipaje.map((e, i) => {
                  const p = productoBySku.get(e.sku);
                  const fam = p?.familia_id
                    ? familiaById.get(p.familia_id)
                    : null;
                  const foto = photoBySku.get(e.sku);
                  return (
                    <li
                      key={`${e.sku}-${i}`}
                      className="flex flex-col items-center"
                    >
                      <Link
                        href={fam ? `/piezas/${fam.slug}` : "/yo"}
                        className="group flex h-16 w-16 items-center justify-center rounded-full border border-piedra bg-fondo transition-colors hover:border-cuero sm:h-20 sm:w-20"
                        title={`${fam?.name ?? e.sku}${p?.color_valiz ? " · " + p.color_valiz : ""}`}
                      >
                        {foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={foto}
                            alt={fam?.name ?? e.sku}
                            className="h-[78%] w-[78%] rounded-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <span className="font-serif text-[10px] italic text-niebla">
                            {e.sku}
                          </span>
                        )}
                      </Link>
                      <p className="mt-2 text-center font-sans text-[9px] uppercase tracking-[0.15em] text-niebla leading-tight">
                        {fam?.name ?? e.sku}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="mt-16 border-t border-piedra pt-8">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Otros correos
            </p>
            <p className="mt-3 font-serif italic leading-relaxed text-niebla">
              Si compraste antes con otro correo, vincúlalo y sumamos tu
              historial Valiz a esta cuenta.
            </p>
            <Link
              href="/yo/email-alt"
              className="mt-5 inline-block border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
            >
              Vincular otro correo →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
