#!/usr/bin/env python3
"""
cargar_codigos.py — Carga lote de códigos de descuento de Shopify a la
tabla `codigos_disponibles`. Cada código tiene una denominación CLP fija.

Uso típico:
  1. En Shopify admin generas un lote de códigos únicos no acumulables
     (Discounts → Create discount → Amount off products → Discount code →
     Generate codes → ej 50 códigos, $5.000 fijo).
  2. Exportas el CSV con los códigos.
  3. Corres este script:
       cd /Users/benja/valiz-bitacora
       .venv/bin/python scripts/cargar_codigos.py 5000 codigos_5k.csv
     Donde:
       - 5000 = denominación CLP de cada código
       - codigos_5k.csv = CSV con un código por línea, primera línea
         puede ser header (ignorada si es texto no-código)

Idempotente: códigos que ya existen se saltan (unique constraint en code).

Para cargar manualmente sin CSV:
  echo "VALIZ-AAAA,VALIZ-BBBB,VALIZ-CCCC" | tr ',' '\\n' | \\
    .venv/bin/python scripts/cargar_codigos.py 5000 -
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


def parse_codes_from(source: str) -> list[str]:
    """Lee códigos desde un archivo o stdin. Devuelve lista de strings,
    skip de líneas vacías y de headers obvios."""
    if source == "-":
        raw_lines = sys.stdin.read().splitlines()
    else:
        path = Path(source)
        if not path.exists():
            sys.exit(f"❌ No existe {path}")
        # utf-8-sig descarta el BOM si lo hay (Shopify y Excel a veces lo
        # incluyen al inicio del CSV).
        raw_lines = path.read_text(encoding="utf-8-sig").splitlines()

    codes = []
    for line in raw_lines:
        # Manejar CSV simple — toma primera columna; ignora vacías
        first = line.split(",")[0].strip().strip('"').strip("'")
        if not first:
            continue
        # Skip headers obvios
        if first.lower() in {
            "code",
            "código",
            "codigo",
            "discount code",
            "discount codes",  # Shopify exporta así (con s)
        }:
            continue
        codes.append(first)
    return codes


def main():
    if len(sys.argv) != 3:
        sys.exit(
            "uso: cargar_codigos.py <denominacion_clp> <archivo.csv|-> \n"
            "ej:  cargar_codigos.py 5000 codigos_5k.csv"
        )
    try:
        denom = int(sys.argv[1])
    except ValueError:
        sys.exit("❌ Denominación tiene que ser entero (ej 5000).")
    if denom <= 0:
        sys.exit("❌ Denominación tiene que ser > 0.")

    codes = parse_codes_from(sys.argv[2])
    if not codes:
        sys.exit("❌ No se leyeron códigos.")

    print(f"📥 {len(codes)} códigos leídos para denominación CLP {denom:,}")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    rows = [{"code": c, "denominacion_clp": denom} for c in codes]
    BATCH = 100
    inserted = 0
    skipped = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        # upsert ignora códigos ya existentes (unique en code)
        try:
            sb.table("codigos_disponibles").insert(chunk).execute()
            inserted += len(chunk)
        except Exception as e:
            # Probablemente alguno duplicado — fallback a inserts individuales
            for row in chunk:
                try:
                    sb.table("codigos_disponibles").insert(row).execute()
                    inserted += 1
                except Exception:
                    skipped += 1
        print(f"   procesados {min(i + BATCH, len(rows))}/{len(rows)}")

    print()
    print(f"✅ Insertados: {inserted} · Skipped (duplicados): {skipped}")


if __name__ == "__main__":
    main()
