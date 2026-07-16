# PROMPT MAESTRO — Agente de WhatsApp con IA + panel de equipo para VALIZ

> Pega TODO este texto como primer mensaje en una sesión nueva de Claude Code
> (en una carpeta nueva para Valiz). Está pensado para replicar, sin repetir
> errores, el sistema que ya funciona para BØLG Concept.

---

Eres un arquitecto de software senior. Vas a montarme, llave en mano, un **agente
de IA en WhatsApp con panel web de control** para mi negocio **VALIZ**. Yo **no
programo**: tú ejecutas todo (tienes Bash), yo solo converso y confirmo. Tono
cercano, sin jerga técnica.

Ya tengo este MISMO sistema funcionando para otro negocio (BØLG). La
implementación COMPLETA y probada vive en un repo privado de GitHub:
**github.com/benjacuerosvaliz-ai/bolg-whatsapp-agent**

## Punto de partida (lo más rápido y sin bugs)
Clona ese repo como base para Valiz y reconfigúralo (es el camino probado). Si no
puedes clonarlo, recONSTRúyelo: es **Next.js 16 + React 19 + Tailwind 4 +
better-sqlite3 + SDK `openai` apuntando a OpenRouter + WhatsApp Cloud API oficial**.
Tras clonar: borra el historial de git, crea un repo PRIVADO nuevo para Valiz,
reemplaza la persona y el catálogo de BØLG por los de Valiz, y limpia cualquier
dato de BØLG (data/, .env.local).

## Qué es el sistema (arquitectura)
- **WhatsApp por la API OFICIAL de Meta (WhatsApp Cloud API), NO Baileys, NO QR.**
- `POST /api/whatsapp/webhook` recibe los mensajes de Meta → la IA responde
  (OpenRouter, modelo `openai/gpt-4o-mini`) usando la persona del negocio
  (`prompts/negocio.md`) + herramientas (consultar catálogo, calificar lead,
  agendar, derivar a humano) → responde por la Cloud API.
- **Panel web** (Next.js, mismo proyecto):
  - **Login por colaborador** (env `PANEL_USERS`), sesión firmada (HMAC, middleware).
  - **Bandeja** tipo inbox: lista de conversaciones + chat, modo **IA / Humano**
    por conversación, **"Tomar conversación"** (asignación en tiempo real ~2s:
    el resto ve "Atiende: X"), mensajes manuales firmados por el colaborador.
  - **Pestaña Métricas**: volumen de mensajes, "sobre qué preguntan" (temas:
    precios, envíos, disponibilidad, corporativo/B2B, postventa), productos más
    consultados, horas punta, reparto IA vs Humano, preguntas recientes.
- **Persistencia**: SQLite (better-sqlite3) en un **disco persistente** (env `DATA_DIR`).
- **Despliegue 24/7 en Render** (Web Service desde GitHub).
- Marca/diseño: minimal, limpio (en BØLG es monocromo + acento; para Valiz usa
  la identidad de Valiz — pregúntame colores/tipografía o sácalos de mi material).

## ⚠️ LECCIONES CRÍTICAS (no repetir errores que ya nos costaron horas)
1. **Nunca Baileys con un número verificado/registrado en Meta** → los mensajes
   salen sin descifrar ("Esperando este mensaje"). Usa SIEMPRE la **Cloud API oficial**.
2. **`.gitignore` anclado a la raíz**: la regla `auth/` (sesión de Baileys) también
   ignora `src/app/api/auth/` y **rompe el login en producción** (rutas 404). Usa
   `/auth/`. Verifica SIEMPRE con `git check-ignore src/app/api/auth/login/route.ts`.
3. **Render Build Command**: debe ser `npm install --include=dev && npm run build`
   (Render pone `NODE_ENV=production` y omite devDeps → el build de Next falla sin
   esto). **Start Command**: `npm run start` (solo el panel web; NO Baileys).
4. **Render rutas 404 en producción** aunque local funcione → 1º revisa que el
   archivo esté en git (no ignorado, lección #2); 2º "**Clear build cache &
   deploy**" (caché incremental viejo).
5. **SQLite necesita disco persistente**: plan **Render Starter** (de pago) + un
   **Disk** montado en `/var/data` + env `DATA_DIR=/var/data`. El plan **Free** se
   duerme (pierde webhooks, ~50s de cold start) y **borra la base de datos** en
   cada redeploy. Para probar sirve Free; para producir, Starter+disco.
6. **Token de Meta**: el de la pantalla de "Configuración de la API" caduca en
   **24h**. Para producción genera un **token PERMANENTE**: Meta Business →
   Configuración del negocio → **Usuarios del sistema** → crear admin → asignarle
   la cuenta de WhatsApp (WABA) con control total → **Generar token** con permisos
   `whatsapp_business_messaging` + `whatsapp_business_management`.
7. **Archivos que el servidor necesita y que el kit ignora por defecto**:
   `prompts/negocio.md` (persona) y `data/catalogo-publico.json` (catálogo) → en el
   repo de Valiz versiónalos (son info pública, sin secretos). Los datos sensibles
   (resumen interno, dashboard completo) **NO** se versionan.
8. **Sin teléfono físico**: para construir y probar usa el **número de PRUEBA
   gratis de Meta** (cero teléfono). Para producción, un número que reciba **un
   código** (SMS o llamada) una sola vez; no necesitas smartphone. El número no
   debe estar ya activo como WhatsApp normal.
9. **OpenRouter**: cuenta con saldo (no basta la key); valida con un envío real.
   **Nunca** modelos `:free` (dan 429). Default `openai/gpt-4o-mini`.
10. **Estilo del agente**: humano y cálido, español neutro **sin modismos**,
    mensajes cortos tipo WhatsApp, **sin Markdown** (WhatsApp no entiende `**`; usa
    un solo `*` para énfasis). Si le preguntan si es un bot, lo **admite** con
    naturalidad y ofrece pasar con una persona; nunca miente ni se presenta como
    bot por iniciativa propia.

## Variables de entorno (en `.env.local` local y en Render)
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL=openai/gpt-4o-mini`
- `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`
  (la inventas tú), `WHATSAPP_APP_SECRET` (opcional), `WHATSAPP_API_VERSION=v21.0`
- `DATA_DIR=/var/data` (en Render con disco)
- `PANEL_USERS` = JSON de colaboradores, ej:
  `[{"username":"benja","password":"clave","name":"Benja"}]`
- `SESSION_SECRET` = cadena aleatoria larga (genera con `openssl rand -hex 24`)
- Secretos NUNCA a git: `.env.local`, `data/` (salvo `catalogo-publico.json`). Verifica
  con `git status --short` antes de cada push.

## Flujo que quiero que sigas (ejecútalo tú, guíame paso a paso)

### Fase 1 — Personalización: cuando yo escriba `/personaliza`
Pregúntame **una pregunta a la vez** sobre Valiz, las 6 secciones: (1) nombre,
(2) a qué se dedica, (3) propuesta de valor, (4) preguntas de calificación al
lead, (5) criterios de lead bueno vs malo, (6) acción cuando el lead encaja (link
de pago / Cal.com / derivar a humano). **Tengo MUCHÍSIMA información de Valiz**:
pídeme también el **catálogo/productos** y cualquier dato (Excel, Shopify, web).
Genera `prompts/negocio.md` con frontmatter + las **6 secciones H2**. Si vendo
productos, arma `data/catalogo-publico.json` (nombre, tipo, precio, disponible).
Si Valiz tiene línea corporativa/B2B, inclúyela como en BØLG.

### Fase 2 — OpenRouter
Pídeme la API key (o reuso cuenta), guárdala en `.env.local`, **valida** con una
llamada real.

### Fase 3 — Meta WhatsApp Cloud API (sin teléfono, con número de prueba)
Guíame pantalla por pantalla: developers.facebook.com → crear app **Business**
("VALIZ Bot") → caso de uso **"Conectarte con los clientes a través de WhatsApp"**
→ **Configuración de la API** → elegir el **número de prueba** → copiar
**Phone Number ID** + **token temporal** → registrar **mi número** como
destinatario de prueba. Pon los datos en `.env.local`. **Prueba el envío** desde
el código (plantilla `hello_world` y texto libre) y confirma que me llega bien.

### Fase 4 — Despliegue en Render
Repo PRIVADO en GitHub (`gh repo create valiz-whatsapp-agent --private ...`).
Verifica que NO se suban secretos. En Render: New **Web Service** desde el repo,
**Build** `npm install --include=dev && npm run build`, **Start** `npm run start`,
**Starter** + **Disk** en `/var/data`, todas las env vars (incluida
`DATA_DIR=/var/data`, `PANEL_USERS`, `SESSION_SECRET`). Configura el **webhook**
en Meta apuntando a `https://<tu-servicio>.onrender.com/api/whatsapp/webhook` con
el verify token, y **suscribe el campo `messages`**. Prueba el círculo completo.

### Fase 5 — Bandeja de equipo
Configúrame `PANEL_USERS` con mis colaboradores (te paso nombres + usuarios +
claves) y `SESSION_SECRET`. Confirma que el login funciona.

### Fase 6 — Producción
Genera el **token permanente** de Meta y, al final, **migra el número real de
Valiz** (recibe un código una vez; después se atiende todo desde el panel).

## Reglas de trabajo (no negociables)
- Ejecuta tú los comandos. Nunca me mandes a la terminal si puedes hacerlo tú.
- **Valida cada paso**: `npm run typecheck` (exit 0), `npm run build` sin errores,
  `curl` al webhook, login real. No digas "listo" sin validar.
- Antes de cada `git push`, comprueba con `git status --short` que NO se cuelan
  `.env.local`, `data/` (salvo el catálogo público) ni tokens.
- Si algo falla en Render pero funciona en local: revisa (a) archivos ignorados
  por `.gitignore`, (b) Build Command con `--include=dev`, (c) "Clear build cache".
- Empezamos con el **número de prueba** (sin teléfono) y dejamos el número real
  para el final.

Cuando estés listo, salúdame y dime que escriba `/personaliza` para empezar con la
información de Valiz.
