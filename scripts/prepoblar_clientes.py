#!/usr/bin/env python3
"""
prepoblar_clientes.py — Pre-crea auth.users + user_profiles para
todos los emails únicos en orders. Idempotente: si el email ya existe,
skip.

FLUJO:
  1. Lee emails únicos de la tabla orders (con financial_status válido)
  2. Lista auth.users existentes para evitar duplicados
  3. Por cada email nuevo:
     - admin.auth.create_user(email, email_confirm=True)
     - Trigger automático crea user_profile + auto-genera handle
  4. NO asigna código de referido ni otorga 1000 pts — eso sigue
     lazy (al primer login del cliente)

USO:
  cd /Users/benja/valiz-bitacora
  .venv/bin/python scripts/prepoblar_clientes.py --limit 10  # smoke test
  .venv/bin/python scripts/prepoblar_clientes.py --limit 10 --dry-run
  .venv/bin/python scripts/prepoblar_clientes.py            # toda la base
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Cantidad máxima de clientes a crear (para smoke test). Default: todos.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo lista qué se crearía sin tocar Supabase.",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.1,
        help="Segundos a esperar entre creaciones (rate limit). Default 0.1s.",
    )
    args = parser.parse_args()

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 1. Emails únicos en orders (pagadas o partially_refunded)
    # Paginamos porque Supabase default limit es 1000 rows
    print("📥 Leyendo emails únicos de orders (paginado)…")
    emails_orders: set[str] = set()
    PAGE = 1000
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

    # 2. Auth.users existentes
    print("🔍 Listando auth.users existentes (puede tardar)…")
    existing_users = sb.auth.admin.list_users()
    emails_existentes = set(
        (u.email or "").lower().strip() for u in existing_users
    )
    print(f"   {len(emails_existentes)} usuarios ya existen en auth.users")

    # 3. Diff
    a_crear = sorted(emails_orders - emails_existentes)
    print(f"\n🆕 Emails a crear: {len(a_crear)}")

    if args.limit:
        a_crear = a_crear[: args.limit]
        print(f"   (limitado a {len(a_crear)} para esta corrida)")

    if not a_crear:
        print("\n✅ Todo al día. Nada que crear.")
        return

    if args.dry_run:
        print("\n📋 Dry-run · primeros 20 emails que se crearían:")
        for e in a_crear[:20]:
            print(f"   - {e}")
        if len(a_crear) > 20:
            print(f"   … y {len(a_crear) - 20} más")
        return

    # 4. Crear auth.user + user_profile (no hay trigger automático,
    # creamos ambos manualmente)
    print(f"\n🚀 Creando {len(a_crear)} auth.users + user_profiles…")
    ok = 0
    fail = 0
    fail_examples: list[str] = []
    t0 = time.time()
    for i, email in enumerate(a_crear, 1):
        try:
            created = sb.auth.admin.create_user(
                {
                    "email": email,
                    "email_confirm": True,  # verificado sin send magic
                }
            )
            user_id = created.user.id
            # Insert user_profile (trigger fn_assign_handle auto-genera
            # el handle al insertar)
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

    print()
    print(f"✅ Listo. Creados {ok} · fallidos {fail}")
    if fail_examples:
        print("\nEjemplos de fallos (primeros 5):")
        for ex in fail_examples:
            print(f"   - {ex}")


if __name__ == "__main__":
    main()
