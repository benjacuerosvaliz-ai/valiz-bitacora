#!/usr/bin/env python3
"""
prepoblar_clientes.py — Pre-crea auth.users + user_profiles para
todos los emails únicos en orders, y otorga puntos iniciales:

  • Bono bienvenida: 5.000 pts (motivo='bono_bienvenida')
  • Bono familia nueva: 500 pts por cada familia distinta que ya tienen
    (motivo='bono_familia_nueva', referencia_id=familia_slug)

Idempotente:
  - Si el email ya existe en auth.users, skip de la creación.
  - Si ya tiene movimiento de bienvenida (vía bono_bienvenida o
    ajuste_admin con refId 'bienvenida:<id>'), no lo duplica.
  - Si ya tiene bono_familia_nueva para una familia, no lo duplica.

FASES:
  1) PROFILES — crea auth.user + user_profile para emails nuevos.
  2) PUNTOS — recorre TODOS los user_profiles que matchean con orders,
              inserta welcome + bonos de familia.

USO:
  cd /Users/benja/valiz-bitacora
  .venv/bin/python scripts/prepoblar_clientes.py --limit 10
  .venv/bin/python scripts/prepoblar_clientes.py --limit 10 --dry-run
  .venv/bin/python scripts/prepoblar_clientes.py            # toda la base
  .venv/bin/python scripts/prepoblar_clientes.py --solo-puntos
  # ↑ saltea fase 1, solo otorga puntos a perfiles existentes
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit("❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")

BONO_BIENVENIDA = 2000
BONO_FAMILIA_NUEVA = 500
PAGE = 1000

# Fallback SKU → familia por prefix, espejo de lib/product-photos.ts.
# Útil cuando el SKU es viejo/discontinuado y no está en productos.
# Orden importa: prefijos más específicos primero.
import re

FAMILY_PREFIXES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^MAM-G-"), "mochila-alforja-mama"),
    (re.compile(r"^MAC-G-"), "mochila-alforja-chica"),
    (re.compile(r"^MA-G-"), "mochila-alforja"),
    (re.compile(r"^M-C-"), "mochila-chica"),
    (re.compile(r"^B-G-"), "banano-grande"),
    (re.compile(r"^B-M-"), "banano-midi"),
    (re.compile(r"^B-C-"), "banano-chico"),
    (re.compile(r"^BI-G-"), "billetera-grande"),
    (re.compile(r"^CT-G-"), "cartera-zarga-grande"),
    (re.compile(r"^C-C-"), "cinturon-chico"),
    (re.compile(r"^T-S-"), "tabaquera"),
    (re.compile(r"^T-G-"), "tabaquera"),
    (re.compile(r"^T-"), "tabaquera"),
    (re.compile(r"^PP-"), "porta-pasaporte"),
    (re.compile(r"^TJ-"), "tarjetero"),
    (re.compile(r"^S-"), "strap"),
]


def resolver_familia(sku: str | None, sku_to_familia: dict[str, str]) -> str | None:
    """Devuelve slug de familia por catálogo, fallback a prefix regex."""
    if not sku:
        return None
    # 1. Catálogo
    fam = sku_to_familia.get(sku)
    if fam:
        return fam
    # 2. Prefix
    for regex, slug in FAMILY_PREFIXES:
        if regex.match(sku):
            return slug
    return None


# ----------------------------------------------------------------------
# Helpers idempotentes
# ----------------------------------------------------------------------
def ya_tiene_bienvenida(sb, user_id: str) -> bool:
    """True si el user ya tiene bono de bienvenida vía cualquier motivo."""
    # bono_bienvenida (pre-pob o reconcile.ts)
    r1 = (
        sb.table("puntos_movimientos")
        .select("id", count="exact", head=True)
        .eq("user_id", user_id)
        .eq("motivo", "bono_bienvenida")
        .execute()
    )
    if (r1.count or 0) > 0:
        return True
    # ajuste_admin con refId bienvenida:<id> (perfil page legacy)
    r2 = (
        sb.table("puntos_movimientos")
        .select("id", count="exact", head=True)
        .eq("user_id", user_id)
        .eq("motivo", "ajuste_admin")
        .eq("referencia_id", f"bienvenida:{user_id}")
        .execute()
    )
    return (r2.count or 0) > 0


def ya_tiene_familia(sb, user_id: str, familia_slug: str) -> bool:
    r = (
        sb.table("puntos_movimientos")
        .select("id", count="exact", head=True)
        .eq("user_id", user_id)
        .eq("motivo", "bono_familia_nueva")
        .eq("referencia_id", familia_slug)
        .execute()
    )
    return (r.count or 0) > 0


# ----------------------------------------------------------------------
# Fase 1: crear auth.users + user_profiles
# ----------------------------------------------------------------------
def fase_profiles(sb, args) -> None:
    print("📥 [Fase 1] Leyendo emails únicos de orders (paginado)…")
    emails_orders: set[str] = set()
    offset = 0
    while True:
        rs = (
            sb.table("orders")
            .select("email")
            .in_("financial_status", ["paid", "partially_refunded"])
            .not_.is_("email", "null")
            .range(offset, offset + PAGE - 1)
            .execute()
        )
        batch = rs.data or []
        if not batch:
            break
        for o in batch:
            e = (o.get("email") or "").lower().strip()
            if e:
                emails_orders.add(e)
        if len(batch) < PAGE:
            break
        offset += PAGE
    print(f"   {len(emails_orders)} emails únicos con compras")

    print("🔍 Listando auth.users existentes (paginado, puede tardar)…")
    emails_existentes: set[str] = set()
    page = 1
    while True:
        users = sb.auth.admin.list_users(page=page, per_page=1000)
        if not users:
            break
        for u in users:
            e = (u.email or "").lower().strip()
            if e:
                emails_existentes.add(e)
        if len(users) < 1000:
            break
        page += 1
        if page > 50:
            print("   ⚠ aborting at page 50 (más de 50k users?)")
            break
    print(f"   {len(emails_existentes)} usuarios ya existen en auth.users")

    a_crear = sorted(emails_orders - emails_existentes)
    print(f"\n🆕 Emails a crear: {len(a_crear)}")

    if args.limit:
        a_crear = a_crear[: args.limit]
        print(f"   (limitado a {len(a_crear)} para esta corrida)")

    if not a_crear:
        print("✅ Nada que crear en fase 1.")
        return

    if args.dry_run:
        print("\n📋 Dry-run · primeros 20 emails que se crearían:")
        for e in a_crear[:20]:
            print(f"   - {e}")
        if len(a_crear) > 20:
            print(f"   … y {len(a_crear) - 20} más")
        return

    print(f"\n🚀 Creando {len(a_crear)} auth.users + user_profiles…")
    ok = 0
    fail = 0
    fail_examples: list[str] = []
    t0 = time.time()
    for i, email in enumerate(a_crear, 1):
        try:
            created = sb.auth.admin.create_user(
                {"email": email, "email_confirm": True}
            )
            user_id = created.user.id
            sb.table("user_profiles").insert(
                {"id": user_id, "email": email}
            ).execute()
            ok += 1
        except Exception as e:
            fail += 1
            if len(fail_examples) < 5:
                fail_examples.append(f"{email}: {str(e)[:80]}")
        if i % 50 == 0 or i == len(a_crear):
            elapsed = time.time() - t0
            rate = i / elapsed if elapsed > 0 else 0
            print(f"   {i}/{len(a_crear)} · {ok} ok · {fail} fail · {rate:.1f}/s")
        if args.sleep > 0 and i < len(a_crear):
            time.sleep(args.sleep)

    print(f"\n✅ Fase 1: creados {ok} · fallidos {fail}")
    if fail_examples:
        print("Ejemplos de fallos (primeros 5):")
        for ex in fail_examples:
            print(f"   - {ex}")


# ----------------------------------------------------------------------
# Fase 2: otorgar puntos iniciales (welcome + familia)
# ----------------------------------------------------------------------
def fase_puntos(sb, args) -> None:
    print("\n📥 [Fase 2] Construyendo SKU → familia_slug…")
    prods_resp = sb.table("productos").select("sku, familias(slug)").execute()
    sku_to_familia: dict[str, str] = {}
    for p in prods_resp.data or []:
        fam = p.get("familias")
        slug = None
        if isinstance(fam, list) and fam:
            slug = fam[0].get("slug") if isinstance(fam[0], dict) else None
        elif isinstance(fam, dict):
            slug = fam.get("slug")
        sku = p.get("sku")
        if sku and slug:
            sku_to_familia[sku] = slug
    print(f"   {len(sku_to_familia)} SKUs mapeados")

    print("📥 Cargando orders + items (paid/partially_refunded)…")
    email_to_familias: dict[str, set[str]] = {}
    offset = 0
    while True:
        rs = (
            sb.table("orders")
            .select("email, financial_status, order_items(sku)")
            .in_("financial_status", ["paid", "partially_refunded"])
            .not_.is_("email", "null")
            .range(offset, offset + PAGE - 1)
            .execute()
        )
        batch = rs.data or []
        if not batch:
            break
        for o in batch:
            email = (o.get("email") or "").lower().strip()
            if not email:
                continue
            for item in o.get("order_items") or []:
                sku = item.get("sku")
                fam = resolver_familia(sku, sku_to_familia)
                if fam:
                    email_to_familias.setdefault(email, set()).add(fam)
        if len(batch) < PAGE:
            break
        offset += PAGE
    print(f"   {len(email_to_familias)} emails con familia mapeada")

    print("📥 Cargando user_profiles (paginado)…")
    profiles: dict[str, str] = {}  # email_lc → user_id
    offset = 0
    while True:
        rs = (
            sb.table("user_profiles")
            .select("id, email")
            .not_.is_("email", "null")
            .range(offset, offset + PAGE - 1)
            .execute()
        )
        batch = rs.data or []
        if not batch:
            break
        for row in batch:
            e = (row.get("email") or "").lower().strip()
            if e:
                profiles[e] = row["id"]
        if len(batch) < PAGE:
            break
        offset += PAGE
    print(f"   {len(profiles)} user_profiles cargados")

    # Set de emails con compra (para el welcome de quienes no tienen
    # familia mapeada — p.ej. solo compraron strap/accesorio sin slug).
    print("📥 Cargando set de emails con compra (paid)…")
    emails_con_compra: set[str] = set()
    offset = 0
    while True:
        rs = (
            sb.table("orders")
            .select("email")
            .in_("financial_status", ["paid", "partially_refunded"])
            .not_.is_("email", "null")
            .range(offset, offset + PAGE - 1)
            .execute()
        )
        batch = rs.data or []
        if not batch:
            break
        for o in batch:
            e = (o.get("email") or "").lower().strip()
            if e:
                emails_con_compra.add(e)
        if len(batch) < PAGE:
            break
        offset += PAGE
    print(f"   {len(emails_con_compra)} emails con compra")

    targets = [
        (email, uid)
        for email, uid in profiles.items()
        if email in emails_con_compra
    ]
    print(f"\n🎁 Perfiles a procesar: {len(targets)}")

    if args.limit:
        targets = targets[: args.limit]
        print(f"   (limitado a {len(targets)})")

    if args.dry_run:
        print("\n📋 Dry-run · primeros 10:")
        for email, uid in targets[:10]:
            fams = email_to_familias.get(email, set())
            print(f"   - {email}  (familias: {sorted(fams) or 'ninguna'})")
        return

    print(f"\n🚀 Otorgando puntos iniciales a {len(targets)} perfiles…")
    n_welcome = 0
    n_familias = 0
    skip_welcome = 0
    fail = 0
    fail_examples: list[str] = []
    t0 = time.time()
    for i, (email, uid) in enumerate(targets, 1):
        try:
            # 1. Welcome
            if ya_tiene_bienvenida(sb, uid):
                skip_welcome += 1
            else:
                sb.table("puntos_movimientos").insert(
                    {
                        "user_id": uid,
                        "delta": BONO_BIENVENIDA,
                        "motivo": "bono_bienvenida",
                        "referencia_id": None,
                    }
                ).execute()
                n_welcome += 1

            # 2. Familias
            for fam in sorted(email_to_familias.get(email, set())):
                if ya_tiene_familia(sb, uid, fam):
                    continue
                sb.table("puntos_movimientos").insert(
                    {
                        "user_id": uid,
                        "delta": BONO_FAMILIA_NUEVA,
                        "motivo": "bono_familia_nueva",
                        "referencia_id": fam,
                    }
                ).execute()
                n_familias += 1
        except Exception as e:
            fail += 1
            if len(fail_examples) < 5:
                fail_examples.append(f"{email}: {str(e)[:80]}")
        if i % 50 == 0 or i == len(targets):
            elapsed = time.time() - t0
            rate = i / elapsed if elapsed > 0 else 0
            print(
                f"   {i}/{len(targets)} · welcome {n_welcome} ins / {skip_welcome} skip"
                f" · familias {n_familias} ins · {fail} fail · {rate:.1f}/s"
            )
        if args.sleep > 0 and i < len(targets):
            time.sleep(args.sleep)

    print()
    print(
        f"✅ Fase 2: {n_welcome} welcome insertados · {skip_welcome} skip"
        f" · {n_familias} bonos familia · {fail} fail"
    )
    if fail_examples:
        print("Ejemplos de fallos (primeros 5):")
        for ex in fail_examples:
            print(f"   - {ex}")


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Máximo de perfiles a tocar en cada fase (smoke test).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="No escribe en Supabase, solo lista.",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.1,
        help="Segundos entre operaciones (rate limit). Default 0.1s.",
    )
    parser.add_argument(
        "--solo-puntos",
        action="store_true",
        help="Salta fase 1 (crear auth.users) y va directo a otorgar puntos.",
    )
    parser.add_argument(
        "--solo-profiles",
        action="store_true",
        help="Salta fase 2 (puntos), solo crea auth.users.",
    )
    args = parser.parse_args()

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    if not args.solo_puntos:
        fase_profiles(sb, args)
    else:
        print("⏭  Saltando fase 1 (--solo-puntos).")

    if not args.solo_profiles:
        fase_puntos(sb, args)
    else:
        print("⏭  Saltando fase 2 (--solo-profiles).")


if __name__ == "__main__":
    main()
