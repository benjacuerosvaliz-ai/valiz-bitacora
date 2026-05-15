#!/usr/bin/env python3
"""
sync_orders.py — Lee orders_export.csv del dashboard local y upsert a
`orders` + `order_items` en Supabase. Idempotente por order Name.

Cada fila del CSV es un line item (mismo Name + Email repetido N veces).
Agrupamos por Name, tomamos el header de la primera línea, y por cada
line item escribimos a order_items con su line_index.

FLUJO:
  1. Lee orders_export.csv (path = DASHBOARD_HTML/data/orders_export.csv).
  2. Agrupa por Name. Header viene de la primera fila de cada grupo.
  3. Upsert orders (PK=name) y order_items (unique (order_name, line_index)).
  4. Emails se normalizan lowercase+trim para que el match con
     user_profiles.email funcione.

USO:
  cd /Users/benja/valiz-bitacora
  .venv/bin/python scripts/sync_orders.py
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
DASHBOARD_HTML = Path(
    os.environ.get(
        "DASHBOARD_HTML",
        "/Users/benja/Documents/Claude/Artifacts/valiz-produccion-dashboard/index.html",
    )
)
DATA_DIR = DASHBOARD_HTML.parent / "data"

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit("❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")


def parse_dt(s: str) -> str | None:
    """Parses Shopify datetime '2026-05-10 16:49:09 -0400' → ISO string."""
    if not s or not s.strip():
        return None
    try:
        # Shopify usa formato "YYYY-MM-DD HH:MM:SS -ZZZZ"
        return datetime.strptime(s.strip(), "%Y-%m-%d %H:%M:%S %z").isoformat()
    except Exception:
        return None


def parse_num(s: str) -> float:
    if not s or not s.strip():
        return 0.0
    try:
        return float(s.strip())
    except Exception:
        return 0.0


def parse_int(s: str) -> int:
    if not s or not s.strip():
        return 0
    try:
        return int(float(s.strip()))
    except Exception:
        return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--csv",
        default="orders_export.csv",
        help="Nombre del CSV dentro de data/ del dashboard. Default 'orders_export.csv' (semanal); usar 'orders_export_full.csv' para bootstrap histórico.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo parsea y reporta; no toca Supabase.",
    )
    args = parser.parse_args()

    csv_path = DATA_DIR / args.csv
    if not csv_path.exists():
        sys.exit(f"❌ No existe {csv_path}")

    print(f"📥 Leyendo {csv_path}…")
    with csv_path.open("r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    print(f"   {len(rows)} filas (line items)")

    by_order: dict[str, dict] = {}
    items_by_order: dict[str, list[dict]] = defaultdict(list)

    for row in rows:
        name = (row.get("Name") or "").strip()
        if not name:
            continue
        email = (row.get("Email") or "").strip().lower()
        if not email:
            # Sin email no podemos reconciliar — skip
            continue

        # Header — sobre-escribimos con la primera fila no vacía
        if name not in by_order:
            by_order[name] = {
                "name": name,
                "email": email,
                "financial_status": (row.get("Financial Status") or "").strip().lower() or None,
                "paid_at": parse_dt(row.get("Paid at") or ""),
                "subtotal_clp": parse_num(row.get("Subtotal") or "0"),
                "shipping_clp": parse_num(row.get("Shipping") or "0"),
                "discount_clp": parse_num(row.get("Discount Amount") or "0"),
                "discount_code": (row.get("Discount Code") or "").strip() or None,
                "total_clp": parse_num(row.get("Total") or "0"),
                "currency": (row.get("Currency") or "CLP").strip() or "CLP",
                "shipping_city": (row.get("Shipping City") or "").strip() or None,
                "shipping_province": (row.get("Shipping Province Name") or row.get("Shipping Province") or "").strip() or None,
                "shipping_country": (row.get("Shipping Country") or "").strip() or None,
                "source": "shopify",
                "created_at": parse_dt(row.get("Created at") or ""),
            }

        sku = (row.get("Lineitem sku") or "").strip()
        item_name = (row.get("Lineitem name") or "").strip() or None
        qty = parse_int(row.get("Lineitem quantity") or "0")
        unit_price = parse_num(row.get("Lineitem price") or "0")
        if not sku and not item_name:
            continue

        items_by_order[name].append(
            {
                "order_name": name,
                "line_index": len(items_by_order[name]),
                "sku": sku or None,
                "lineitem_name": item_name,
                "qty": qty or 1,
                "unit_price_clp": unit_price,
            }
        )

    print(f"   {len(by_order)} orders únicas; {sum(len(v) for v in items_by_order.values())} line items totales")
    distinct_emails = len({o["email"] for o in by_order.values()})
    total_revenue = sum(o["total_clp"] for o in by_order.values())
    print(f"   {distinct_emails} emails distintos; revenue total CLP {total_revenue:,.0f}")

    if args.dry_run:
        print("ℹ️  dry-run; sin escribir a Supabase.")
        return

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Upsert orders en batches de 200
    orders_list = list(by_order.values())
    BATCH = 200
    print(f"🚀 Upsert orders…")
    for i in range(0, len(orders_list), BATCH):
        chunk = orders_list[i : i + BATCH]
        sb.table("orders").upsert(chunk, on_conflict="name").execute()
        print(f"   {min(i + BATCH, len(orders_list))}/{len(orders_list)}")

    # Para order_items, primero borramos los existentes de las orders que
    # vamos a re-poblar (idempotencia limpia) y luego insertamos.
    print(f"🧹 Limpiando order_items existentes de las orders sincronizadas…")
    order_names = list(by_order.keys())
    for i in range(0, len(order_names), BATCH):
        chunk = order_names[i : i + BATCH]
        sb.table("order_items").delete().in_("order_name", chunk).execute()

    print(f"🚀 Insert order_items…")
    all_items: list[dict] = []
    for items in items_by_order.values():
        all_items.extend(items)
    for i in range(0, len(all_items), BATCH):
        chunk = all_items[i : i + BATCH]
        sb.table("order_items").insert(chunk).execute()
        print(f"   {min(i + BATCH, len(all_items))}/{len(all_items)}")

    # Resumen
    distinct_emails = len({o["email"] for o in orders_list})
    total_revenue = sum(o["total_clp"] for o in orders_list)
    print()
    print(f"✅ Listo.")
    print(f"   orders: {len(orders_list)}")
    print(f"   line items: {len(all_items)}")
    print(f"   emails distintos: {distinct_emails}")
    print(f"   revenue total (CLP): {total_revenue:,.0f}")


if __name__ == "__main__":
    main()
