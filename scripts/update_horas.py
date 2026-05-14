#!/usr/bin/env python3
"""
update_horas.py — Actualiza familias.hours_per_unit en Supabase con la
tabla definida abajo. La decisión histórica detrás de estos valores fue
"subir todo en ~50% redondeado al múltiplo de 5 min hacia arriba" porque
estábamos subestimando el trabajo del taller.

Para ajustar valores: editar HORAS abajo, correr el script. Cada llamada
trae los valores antes/después y termina con un resumen del contador
total horas/año.

Uso:
    cd /Users/benja/valiz-bitacora
    .venv/bin/python scripts/update_horas.py        # dry-run, solo muestra
    .venv/bin/python scripts/update_horas.py --apply
"""
from __future__ import annotations

import argparse
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

# slug → minutos (entero). El script lo convierte a horas decimales para
# guardar en la columna numeric `hours_per_unit`. Los minutos son la
# fuente de verdad humana; las horas en DB son derivadas.
HORAS_MIN = {
    "mochila-alforja-mama": 180,   # 3 h
    "mochila-alforja": 135,        # 2 h 15
    "mochila-alforja-chica": 135,  # 2 h 15
    "mochila-grande": 90,          # 1 h 30 (descontinuada pero histórica)
    "cartera-zarga-grande": 90,    # 1 h 30
    "banano-midi": 70,             # 1 h 10
    "tabaquera": 70,               # 1 h 10
    "banano-grande": 45,
    "mochila-chica": 45,
    "billetera-grande": 45,
    "cinturon-chico": 40,
    "banano-chico": 30,
    "porta-pasaporte": 30,
    "tarjetero": 30,
    "strap": 30,
    "estuche": 30,
}


def fmt_h(min_total: int) -> str:
    h, m = divmod(min_total, 60)
    if h == 0:
        return f"{m} min"
    if m == 0:
        return f"{h} h"
    return f"{h} h {m:02d}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Ejecuta el UPDATE; sin esta flag es dry-run")
    args = parser.parse_args()

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Leer estado actual
    print("📥 Leyendo familias actuales…")
    actuales = sb.table("familias").select("slug, name, hours_per_unit").execute().data
    by_slug = {f["slug"]: f for f in actuales}

    # Calcular ventas para el contador histórico
    ventas = (
        sb.table("ventas_mensuales")
        .select("sku, qty_shopify, qty_tienda_cc, qty_mercadolibre")
        .execute()
        .data
    )
    productos = sb.table("productos").select("sku, familia_id").execute().data
    sku_to_fam = {p["sku"]: p["familia_id"] for p in productos}
    fam_id_to_slug = {f["id"]: f["slug"] for f in sb.table("familias").select("id, slug").execute().data}

    units_por_fam = {}
    for v in ventas:
        fam_id = sku_to_fam.get(v["sku"])
        if not fam_id:
            continue
        slug = fam_id_to_slug.get(fam_id)
        if not slug:
            continue
        qty = (
            (v.get("qty_shopify") or 0)
            + (v.get("qty_tienda_cc") or 0)
            + (v.get("qty_mercadolibre") or 0)
        )
        units_por_fam[slug] = units_por_fam.get(slug, 0) + qty

    # Imprimir tabla comparativa
    print()
    print(f"{'Familia':<26} {'Hoy':>10} {'Propuesta':>14} {'Δ min':>7} {'Unid':>6} {'h antes':>10} {'h después':>11}")
    print("-" * 95)
    total_antes = 0.0
    total_despues = 0.0
    cambios = []
    for slug, min_target in HORAS_MIN.items():
        fila = by_slug.get(slug)
        if not fila:
            print(f"⚠️  {slug}: no existe en familias")
            continue
        actual_h = float(fila.get("hours_per_unit") or 0)
        target_h = round(min_target / 60, 6)
        delta_min = round(min_target - actual_h * 60)
        unidades = units_por_fam.get(slug, 0)
        antes = actual_h * unidades
        despues = target_h * unidades
        total_antes += antes
        total_despues += despues
        cambios.append((slug, actual_h, target_h, delta_min))
        print(
            f"{fila['name']:<26} {fmt_h(round(actual_h*60)):>10} {fmt_h(min_target):>14} {delta_min:>+7} {unidades:>6} {antes:>10.1f} {despues:>11.1f}"
        )

    print("-" * 95)
    print(f"{'TOTAL horas históricas':<59}{total_antes:>10.1f} {total_despues:>11.1f}")
    print(f"{'Δ horas':<59}{'':>10} {total_despues - total_antes:>+11.1f}")

    if not args.apply:
        print()
        print("ℹ️  dry-run; agrega --apply para ejecutar el UPDATE.")
        return

    print()
    print("🚀 Aplicando UPDATE…")
    for slug, _, target_h, _ in cambios:
        sb.table("familias").update({"hours_per_unit": target_h}).eq("slug", slug).execute()
        print(f"  ✓ {slug} → {target_h}")
    print()
    print("✅ Listo.")


if __name__ == "__main__":
    main()
