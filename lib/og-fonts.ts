/**
 * Cargador de fuentes Google para `ImageResponse` (next/og).
 *
 * `next/og` soporta TTF, OTF y WOFF (NO WOFF2). Google Fonts devuelve el
 * formato según el `User-Agent`: si mandamos un UA estilo curl,
 * responde con TTF (que es lo que necesitamos). Con un UA de browser
 * moderno devolvería WOFF2 y next/og no podría usarlo.
 *
 * Cacheamos las fuentes en memoria del runtime (Node) — la primera
 * llamada hace fetch, las siguientes reutilizan.
 */
type Style = "normal" | "italic";
type FontKey = `${string}__${number}__${Style}`;

const cache = new Map<FontKey, ArrayBuffer>();

export async function loadGoogleFont(
  family: string,
  weight: number = 400,
  style: Style = "normal",
): Promise<ArrayBuffer | null> {
  const key: FontKey = `${family}__${weight}__${style}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family,
  ).replace(/%20/g, "+")}:ital,wght@${style === "italic" ? 1 : 0},${weight}&display=swap`;

  try {
    const css = await fetch(url, {
      // UA no-browser para obtener TTF en vez de WOFF2
      headers: { "User-Agent": "curl/7.79.1" },
    }).then((r) => r.text());

    const match = css.match(/src:\s*url\((.+?)\)\s*format/);
    if (!match) return null;

    const buf = await fetch(match[1]).then((r) => r.arrayBuffer());
    cache.set(key, buf);
    return buf;
  } catch {
    return null;
  }
}

/**
 * Carga las 3 fuentes Valiz en paralelo (Newsreader regular + italic
 * + Manrope semibold). Devuelve el array `fonts` listo para pasar a
 * `ImageResponse({ fonts })`.
 *
 * Si alguna falla, omite esa y deja que el sistema haga fallback.
 */
export async function loadValizFonts() {
  const [newsreader, newsreaderItalic, manropeSemi] = await Promise.all([
    loadGoogleFont("Newsreader", 400, "normal"),
    loadGoogleFont("Newsreader", 400, "italic"),
    loadGoogleFont("Manrope", 600, "normal"),
  ]);

  const fonts: {
    name: string;
    data: ArrayBuffer;
    style: "normal" | "italic";
    weight: 400 | 600;
  }[] = [];

  if (newsreader)
    fonts.push({
      name: "Newsreader",
      data: newsreader,
      style: "normal",
      weight: 400,
    });
  if (newsreaderItalic)
    fonts.push({
      name: "Newsreader",
      data: newsreaderItalic,
      style: "italic",
      weight: 400,
    });
  if (manropeSemi)
    fonts.push({
      name: "Manrope",
      data: manropeSemi,
      style: "normal",
      weight: 600,
    });

  return fonts;
}
