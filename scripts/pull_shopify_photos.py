#!/usr/bin/env python3
"""
pull_shopify_photos.py — Para todos los productos activos en Supabase con
shopify_handle, descarga la foto principal desde la tienda valiz.cl, le
quita el fondo con rembg (U2-Net), la optimiza y guarda como webp
transparente en /public/images/productos/<familia-slug>/<sku>/01-front.webp

Idempotente: si el archivo ya existe se omite. Para reprocesar uno borralo
de la carpeta o pasa --force.

Uso:
    cd /Users/benja/valiz-bitacora
    .venv/bin/python scripts/pull_shopify_photos.py [--force] [--limit N]
"""
from __future__ import annotations

import argparse
import os
import sys
from io import BytesIO
from pathlib import Path

import requests
from dotenv import load_dotenv
from PIL import Image
from rembg import new_session, remove
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
SHOPIFY_BASE = "https://www.valiz.cl/products"
OUTPUT_BASE = ROOT / "public" / "images" / "productos"

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit("❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")


def fetch_shopify_image_url(handle: str) -> str | None:
    """Devuelve la URL de la primera imagen del producto en Shopify."""
    url = f"{SHOPIFY_BASE}/{handle}.json"
    try:
        r = requests.get(url, timeout=20)
        if r.status_code != 200:
            return None
        data = r.json()
        images = data.get("product", {}).get("images", [])
        if not images:
            return None
        return images[0].get("src")
    except Exception:
        return None


def process_one(
    sku: str,
    family_slug: str,
    handle: str,
    session,
    force: bool = False,
) -> tuple[bool, str]:
    out_dir = OUTPUT_BASE / family_slug / sku
    out_path = out_dir / "01-front.webp"
    if out_path.exists() and not force:
        return True, "skip (exists)"

    image_url = fetch_shopify_image_url(handle)
    if not image_url:
        return False, "no image in Shopify"

    try:
        img_r = requests.get(image_url, timeout=45)
        img = Image.open(BytesIO(img_r.content))
    except Exception as e:
        return False, f"download fail: {e}"

    # rembg
    try:
        cut = remove(img, session=session)
    except Exception as e:
        return False, f"rembg fail: {e}"

    # Resize a max 1500 ancho (tienda 3D no necesita súper alta resolución)
    if cut.size[0] > 1500:
        new_h = int(cut.size[1] * 1500 / cut.size[0])
        cut = cut.resize((1500, new_h), Image.LANCZOS)

    out_dir.mkdir(parents=True, exist_ok=True)
    cut.save(out_path, "WEBP", quality=85, method=6)
    return True, f"OK ({out_path.stat().st_size // 1024} KB)"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Reprocesar aunque exista")
    parser.add_argument("--limit", type=int, default=None, help="Máximo N productos")
    parser.add_argument("--family", type=str, default=None, help="Solo una familia (slug)")
    args = parser.parse_args()

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    print(f"🔌 Consultando Supabase…")
    fams = sb.table("familias").select("id, slug").execute().data
    family_slug_by_id = {f["id"]: f["slug"] for f in fams}

    q = sb.table("productos").select(
        "sku, shopify_handle, familia_id, color_valiz"
    ).eq("status", "active").not_.is_("shopify_handle", "null")
    if args.family:
        target_fam = next((f for f in fams if f["slug"] == args.family), None)
        if not target_fam:
            sys.exit(f"❌ Familia '{args.family}' no existe")
        q = q.eq("familia_id", target_fam["id"])
    productos = q.order("sku").execute().data
    if args.limit:
        productos = productos[: args.limit]

    print(f"   {len(productos)} SKUs activos con shopify_handle")
    print(f"📦 Cargando modelo rembg…")
    session = new_session("u2net")
    print()

    ok = 0
    skipped = 0
    failed = 0
    for i, p in enumerate(productos, 1):
        sku = p["sku"]
        handle = p["shopify_handle"]
        family_slug = family_slug_by_id.get(p["familia_id"])
        if not family_slug:
            print(f"  [{i:3}/{len(productos)}] {sku} ⚠️  familia sin slug, skip")
            skipped += 1
            continue

        success, msg = process_one(sku, family_slug, handle, session, force=args.force)
        prefix = "✓" if success else "✗"
        print(f"  [{i:3}/{len(productos)}] {prefix} {sku} ({family_slug}) — {msg}")
        if not success:
            failed += 1
        elif msg.startswith("skip"):
            skipped += 1
        else:
            ok += 1

    print()
    print(f"=== resumen ===")
    print(f"  ✓ procesados nuevos: {ok}")
    print(f"  ⏭  skipped (ya existían): {skipped}")
    print(f"  ✗ fallidos: {failed}")


if __name__ == "__main__":
    main()
