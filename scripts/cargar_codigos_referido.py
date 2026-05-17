#!/usr/bin/env python3
"""
cargar_codigos_referido.py — Carga lote de discount codes de referido
desde Shopify a la tabla `codigos_referido`. Cada código se asigna
después por user al pedir su link de referido.

Uso típico:
  1. En Shopify admin generas un lote de códigos:
     Discounts → Create discount → Amount off products → Method
     "Discount code" → Generate multiple → ej 100 códigos, 5%
     descuento, "Limit to one use per customer" ON, sin fecha de fin.
  2. Exportas el CSV.
  3. Corres este script:
       cd /Users/benja/valiz-bitacora
       .venv/bin/python scripts/cargar_codigos_referido.py codigos_ref.csv

Idempotente: códigos ya existentes se saltan (unique constraint).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit("❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")


def parse_codes(source: str) -> list[str]:
    if source == "-":
        raw_lines = sys.stdin.read().splitlines()
    else:
        path = Path(source)
        if not path.exists():
            sys.exit(f"❌ No existe {path}")
        raw_lines = path.read_text(encoding="utf-8-sig").splitlines()

    codes = []
    for line in raw_lines:
        first = line.split(",")[0].strip().strip('"').strip("'")
        if not first:
            continue
        if first.lower() in {
            "code",
            "código",
            "codigo",
            "discount code",
            "discount codes",
        }:
            continue
        codes.append(first)
    return codes


def main():
    if len(sys.argv) != 2:
        sys.exit(
            "uso: cargar_codigos_referido.py <archivo.csv|->\n"
            "ej:  cargar_codigos_referido.py ~/Downloads/ref_codes.csv"
        )

    codes = parse_codes(sys.argv[1])
    if not codes:
        sys.exit("❌ No se leyeron códigos.")

    print(f"📥 {len(codes)} códigos de referido leídos")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    rows = [{"code": c} for c in codes]
    BATCH = 100
    inserted = 0
    skipped = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        try:
            sb.table("codigos_referido").insert(chunk).execute()
            inserted += len(chunk)
        except Exception:
            for row in chunk:
                try:
                    sb.table("codigos_referido").insert(row).execute()
                    inserted += 1
                except Exception:
                    skipped += 1
        print(f"   procesados {min(i + BATCH, len(rows))}/{len(rows)}")

    print()
    print(f"✅ Insertados: {inserted} · Skipped (duplicados): {skipped}")


if __name__ == "__main__":
    main()
