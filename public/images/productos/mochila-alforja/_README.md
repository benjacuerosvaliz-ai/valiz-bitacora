# Fotos · Mochila Alforja Grande

Estructura para el modal interactivo (Phase A, sesión 4).

## Carpetas

Cada subcarpeta corresponde a un SKU activo de la familia. El nombre del
SKU mapea al color Valiz:

| Carpeta         | Color Valiz       |
|-----------------|-------------------|
| `MA-G-CAFGA`    | Café Gastado      |
| `MA-G-CAM`      | Camel             |
| `MA-G-CAR`      | Caramelo          |
| `MA-G-CHA`      | Charol            |
| `MA-G-COBRA`    | Cobra             |
| `MA-G-CRU`      | Crudo             |
| `MA-G-DEN`      | Denim             |
| `MA-G-MIEL`     | Miel              |
| `MA-G-MOKA`     | Moka              |
| `MA-G-MUS`      | Musgo             |
| `MA-G-MUSE`     | Mocha Mousse      |
| `MA-G-NE`       | Negro             |
| `MA-G-NE-F`     | Negro (versión fallada — usa mismas fotos que `MA-G-NE` si quieres) |
| `MA-G-NEGA`     | Negro Gastado     |
| `MA-G-SENE`     | Serpiente Negro   |
| `MA-G-TRICAM`   | Trigo Camel       |
| `MA-G-TRICHO`   | Trigo Chocolate   |
| `MA-G-TRICRU`   | Trigo Crudo       |

## Cómo nombrar las fotos dentro de cada SKU

Mínimo viable (Phase A funciona si solo tienes esta):

- **`01-front.jpg`** — foto frontal limpia del producto, fondo blanco o
  beige. Es la que se ve al abrir el modal y la que cambia cuando el
  usuario clickea el selector de color.

Recomendado para que los hotspots tengan sentido:

- `02-back.jpg` — vista trasera
- `03-interior.jpg` — interior abierto, mostrando compartimento
- `04-detail-zipper.jpg` — close-up de la cremallera
- `05-detail-strap.jpg` — close-up del ajuste de tira
- `06-detail-hardware.jpg` — close-up de herrajes / hebillas
- `07-detail-cuero.jpg` — close-up de la textura del cuero

Sin estas, Phase A igual funciona — los hotspots simplemente harán zoom
sobre la `01-front.jpg` (con CSS transform). Cuando las tengas, el
zoom muestra la foto real del detalle.

## Tamaño y formato

- Formato: **JPG** preferentemente (PNG también sirve si tiene
  transparencia)
- Resolución: **2000–3000px de ancho**. Pásalas pesadas, yo las bajo y
  convierto a WebP optimizado en el sync.
- Sin watermark, sin texto sobreimpreso, sin marcos.

## Cuando estés listo

Avisa "listo Mochila Alforja Grande", y yo:

1. Compruebo qué fotos están en cada carpeta
2. Optimizo todas (resize + WebP)
3. Construyo el modal interactivo: selector de color, hotspots de
   detalles, animación de zoom
4. Lo pruebas en el preview y aprobamos
5. Replicamos la misma estructura para las otras 15 familias

Si una subcarpeta queda vacía porque ese color no tiene foto buena
todavía, el frontend simplemente no la muestra como opción seleccionable.
No revienta nada.
