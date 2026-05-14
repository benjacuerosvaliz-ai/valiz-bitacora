#!/usr/bin/env python3
"""
sync_valiz.py — Lee window.DASH del dashboard local y empuja a Supabase.

FLUJO:
  1. Lee /Users/benja/Documents/Claude/Artifacts/valiz-produccion-dashboard/index.html
  2. Extrae window.DASH = {...};
  3. Upsert cueros únicos (vienen de records[].color_cuero)
  4. Lookup talleristas y familias ya seedeados en la BD
  5. Upsert productos (solo status='active') con FKs resueltos
  6. Upsert ventas_mensuales por SKU × mes (omite (sku, month) con todo en 0)

REQUIERE:
  NEXT_PUBLIC_SUPABASE_URL      ya está en .env.local del proyecto
  SUPABASE_SERVICE_ROLE_KEY     pégalo a .env.local — NO lo commitees

USO:
  cd /Users/benja/valiz-bitacora
  python3 -m venv .venv && source .venv/bin/activate
  pip install -r scripts/requirements.txt
  python scripts/sync_valiz.py
"""
import csv
import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
DASHBOARD_HTML = Path(
    os.environ.get(
        "DASHBOARD_HTML",
        "/Users/benja/Documents/Claude/Artifacts/valiz-produccion-dashboard/index.html",
    )
)
DASHBOARD_PRODUCTS_CSV = DASHBOARD_HTML.parent / "data" / "products_export.csv"

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    sys.exit(
        "❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local"
    )
if not DASHBOARD_HTML.exists():
    sys.exit(f"❌ No existe {DASHBOARD_HTML}")

# Mapping dashboard → BD
PROVEEDOR_TO_TALLERISTA = {
    "ROBERTO": "Roberto",
    "CESAR": "César",
    "DAVID": "David",
}

FAMILIA_TO_SLUG = {
    "Mochila Alforja": "mochila-alforja",
    "Mochila Alforja Mama": "mochila-alforja-mama",
    "Mochila Alforja Chica": "mochila-alforja-chica",
    "Mochila Grande": "mochila-grande",
    "Mochila Chica": "mochila-chica",
    "Banano Grande": "banano-grande",
    "Banano Midi": "banano-midi",
    "Banano Chico": "banano-chico",
    "Cartera Zarga Grande": "cartera-zarga-grande",
    "Billetera Grande": "billetera-grande",
    "Tabaquera": "tabaquera",
    "Porta Pasaporte": "porta-pasaporte",
    "Tarjetero": "tarjetero",
    "Cinturon Chico": "cinturon-chico",
    "Strap": "strap",
    "Estuche": "estuche",
}


def load_dash(html_path: Path) -> dict:
    """Extrae window.DASH = {...} del index.html del dashboard."""
    html = html_path.read_text(encoding="utf-8")
    m = re.search(r"window\.DASH\s*=\s*(\{.*?\});\s*\n", html, re.DOTALL)
    if not m:
        sys.exit(f"❌ window.DASH no encontrado en {html_path}")
    return json.loads(m.group(1))


def load_sku_to_handle(csv_path: Path) -> dict[str, str]:
    """Lee products_export.csv y devuelve {variant_sku: handle}.
    El handle solo aparece en la primera fila de cada producto, las variantes
    siguientes lo heredan implícitamente — Shopify export quirk.
    """
    if not csv_path.exists():
        return {}
    out: dict[str, str] = {}
    last_handle: str | None = None
    with csv_path.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            h = (row.get("Handle") or "").strip()
            if h:
                last_handle = h
            sku = (row.get("Variant SKU") or "").strip()
            if sku and last_handle:
                out[sku] = last_handle
    return out


def upsert_cueros(sb: Client, records: list[dict]) -> dict[str, str]:
    """Upsert cueros con display_name = color Valiz más común para ese code.

    El UI público nunca muestra el código del proveedor — siempre el color Valiz
    (regla de marca). Si un cuero del proveedor tiene >1 color Valiz, gana el
    más frecuente y se imprime una advertencia para que el usuario corrija el
    valiz-overrides.json del dashboard si quiere otro.
    """
    from collections import Counter

    code_to_valiz: dict[str, Counter] = {}
    for r in records:
        if r.get("status") != "active":
            continue
        code = r.get("color_cuero")
        valiz = r.get("color_valiz")
        if not code or code in ("?", "NA", ""):
            continue
        if not valiz or valiz in ("?", ""):
            continue
        code_to_valiz.setdefault(code, Counter())[valiz] += 1

    for code, counter in code_to_valiz.items():
        if len(counter) > 1:
            print(
                f"   ⚠️  {code} mapea a {len(counter)} colores Valiz "
                f"({dict(counter)}) — gana el más frecuente."
            )

    rows = [
        {"code": code, "display_name": counter.most_common(1)[0][0]}
        for code, counter in sorted(code_to_valiz.items())
    ]
    if rows:
        sb.table("cueros").upsert(rows, on_conflict="code").execute()

    res = sb.table("cueros").select("id,code").execute()
    return {row["code"]: row["id"] for row in res.data}


def lookup_by(sb: Client, table: str, key: str) -> dict[str, str]:
    """Lookup {key_value: id} desde una tabla."""
    res = sb.table(table).select(f"id,{key}").execute()
    return {row[key]: row["id"] for row in res.data}


def upsert_productos(
    sb: Client,
    records: list[dict],
    cuero_ids: dict[str, str],
    tallerista_ids: dict[str, str],
    familia_ids: dict[str, str],
    sku_to_handle: dict[str, str],
) -> tuple[int, int]:
    """Upsert productos (solo status='active') con FKs resueltos."""
    rows = []
    skipped = 0

    for r in records:
        if r.get("status") != "active":
            skipped += 1
            continue

        familia_slug = FAMILIA_TO_SLUG.get(r.get("familia", ""))
        tallerista_name = PROVEEDOR_TO_TALLERISTA.get(r.get("proveedor", ""))
        cuero_code = r.get("color_cuero")
        if cuero_code in ("?", "NA", ""):
            cuero_code = None

        rows.append({
            "sku": r["sku"],
            "name": r.get("nombre") or r["sku"],
            "familia_id": familia_ids.get(familia_slug) if familia_slug else None,
            "tallerista_id": tallerista_ids.get(tallerista_name) if tallerista_name else None,
            "cuero_id": cuero_ids.get(cuero_code) if cuero_code else None,
            "color_valiz": r.get("color_valiz") or None,
            "p2": float(r.get("p2") or 0),
            "coleccion": r.get("coleccion") or None,
            "moda": r.get("moda") if r.get("moda") in ("MODA", "CARRYOVER") else "CARRYOVER",
            "fallado": bool(r.get("fallado")),
            "precio": int(r.get("precio") or 0),
            "shopify_handle": sku_to_handle.get(r["sku"]) or r.get("handle") or None,
            "sales_total": int(r.get("sales_l12") or 0),
            "status": "active",
        })

    for i in range(0, len(rows), 500):
        sb.table("productos").upsert(rows[i : i + 500], on_conflict="sku").execute()

    return len(rows), skipped


def upsert_ventas(sb: Client, records: list[dict], months: list[str]) -> int:
    """Upsert ventas_mensuales por SKU × mes. Omite filas con todo en cero."""
    rows = []
    for r in records:
        if r.get("status") != "active":
            continue
        sku = r["sku"]
        mq_s = r.get("monthly_qty_shopify") or []
        mq_c = r.get("monthly_qty_cc") or []
        mq_m = r.get("monthly_qty_ml") or []
        mr = r.get("monthly_rev") or []

        for i, month_str in enumerate(months):
            qty_s = int(mq_s[i]) if i < len(mq_s) else 0
            qty_c = int(mq_c[i]) if i < len(mq_c) else 0
            qty_ml = int(mq_m[i]) if i < len(mq_m) else 0
            rev = int(mr[i]) if i < len(mr) else 0
            if qty_s == 0 and qty_c == 0 and qty_ml == 0 and rev == 0:
                continue
            rows.append({
                "sku": sku,
                "month": f"{month_str}-01",
                "qty_shopify": qty_s,
                "qty_tienda_cc": qty_c,
                "qty_mercadolibre": qty_ml,
                "revenue_clp": rev,
            })

    for i in range(0, len(rows), 1000):
        sb.table("ventas_mensuales").upsert(
            rows[i : i + 1000], on_conflict="sku,month"
        ).execute()
    return len(rows)


def main() -> None:
    print(f"📚 Leyendo {DASHBOARD_HTML.name}…")
    dash = load_dash(DASHBOARD_HTML)
    records = dash["records"]
    months = dash["months"]
    print(f"   {len(records)} records · {len(months)} meses ({months[0]} → {months[-1]})")

    print(f"🔌 Conectando a {SUPABASE_URL}…")
    sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    print("🧶 Upsert cueros…")
    cuero_ids = upsert_cueros(sb, records)
    print(f"   {len(cuero_ids)} cueros únicos")

    print("👤 Lookup talleristas…")
    tallerista_ids = lookup_by(sb, "talleristas", "name")
    print(f"   {list(tallerista_ids)}")

    print("👜 Lookup familias…")
    familia_ids = lookup_by(sb, "familias", "slug")
    print(f"   {len(familia_ids)} familias")

    print("🔗 Cargando handles de Shopify desde CSV…")
    sku_to_handle = load_sku_to_handle(DASHBOARD_PRODUCTS_CSV)
    print(f"   {len(sku_to_handle)} SKUs con handle")

    print("🪡 Upsert productos…")
    upserted, skipped = upsert_productos(
        sb, records, cuero_ids, tallerista_ids, familia_ids, sku_to_handle
    )
    print(f"   {upserted} activos · {skipped} archivados (omitidos)")

    print("💰 Upsert ventas_mensuales…")
    rows = upsert_ventas(sb, records, months)
    print(f"   {rows} (SKU × mes) con actividad")

    print("✅ Sync completo.")


if __name__ == "__main__":
    main()
