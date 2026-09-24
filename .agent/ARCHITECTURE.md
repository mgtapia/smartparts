# ARCHITECTURE — SmartParts

Patrones de arquitectura para la app web. Next.js 15 (App Router, JS sin TypeScript) + Material UI 6 + MUI X Charts 7 + MUI X Data Grid 7 + Firebase (cliente) + firebase-admin (servidor).

---

## 1 · Capas

```
app/                    rutas (App Router) — server components por defecto
  (app)/<módulo>/        shell autenticado, un módulo por carpeta
  login/                 sin shell
  api/                    route handlers — ÚNICO lugar que usa firebase-admin y conectores
src/
  features/<feature>/    smart/dumb: <Feature>Page.jsx + hooks/use<Feature>.js + components/ + constants.js
  components/{common,layout,charts}/   kit de UI reutilizable
  core/costing/           motor de costos — función pura, sin React/Firebase/red
  connectors/             capa de fuentes chinas — un archivo por fuente, mismo contrato
  libs/                   repository ligero + utilidades (firebase, firestore, auth, money, fx)
  libs/admin/             firebase-admin — SOLO se importa desde app/api/**
  contexts/               DI vía Context (Auth, Locale, ThemeMode)
  constants/ mocks/ schemas/ theme/ i18n/
```

## 2 · Server vs. client

- **Server components** por defecto en `app/`. `'use client'` solo en hojas interactivas (formularios, gráficos, tablas con estado).
- **`app/api/**`** (route handlers) es la única capa que puede:
  1. Usar `firebase-admin` (escrituras privilegiadas: parámetros arancelarios, roles).
  2. Ejecutar conectores de sourcing (el scraping/fetch a fuentes chinas no puede correr en el browser: CORS, anti-bot, secretos de API).
  3. Correr jobs (tipo de cambio, reconciliación de rollups).
- El cliente nunca llama a un conector ni a Firestore con permisos elevados directamente — siempre a través de un route handler o de las reglas de Firestore para lecturas/escrituras de usuario normal.

## 3 · Flujo de datos

`UI (feature) → hook (use<Feature>) → repository (src/libs/) → Firestore | route handler → firebase-admin/conector`

Los hooks de feature nunca importan Firestore directo — pasan por el repository, que es lo que se reemplaza mock-por-real entre Fase 1 y Fase 2 sin tocar la UI (ver [[ROADMAP]]).

## 4 · Repository ligero

Un módulo por colección en `src/libs/repos/` (p.ej. `partsRepo.js`, `quotesRepo.js`). Expone funciones planas (`getPart(id)`, `listPartsByVehicle(vehicleId)`, `savePart(data)`), nunca clases. En Fase 1 estos módulos leen de `src/mocks/`; en Fase 2 se reemplaza el cuerpo por llamadas a Firestore sin cambiar la firma.

## 5 · El motor de costos como núcleo puro

`src/core/costing/` es JavaScript puro: **sin React, sin Firebase, sin I/O**. Entra un `CostingInput`, sale un `CostingResult` (tipos en `types.js`). Es la pieza que más se testea y la que **nunca debe importar nada del resto del proyecto** — solo `src/libs/money.js` y `src/libs/fx.js`, que tampoco tienen I/O.

Por qué es un módulo aparte y no funciones sueltas en la feature `costing`: un error de centavos en este motor se propaga a decisiones de compra reales. Aislarlo lo hace barato de testear (function pura → tests unitarios y property-based sin mocks) y fácil de versionar (`engineVersion` en cada resultado, ver [[MOTOR-DE-COSTOS]] §Reproducibilidad).

Todos los montos que produce el motor están en **USD** (así liquida Aduana Chile). La conversión a CLP para la UI vive en `src/libs/fx.js` y es un paso de presentación, no participa de las invariantes de suma del motor.

## 6 · La capa de conectores

`src/connectors/` — un archivo por fuente china (1688, Alibaba, AliExpress, Made-in-China), todos implementando el mismo contrato: `search`, `getProduct`, `getPricingTiers`, `parse`, `healthCheck`, más un objeto `capabilities` (API oficial, requiere proxy, rate limit, riesgo ToS). Detalle completo en [[INTEGRACIONES-CHINA]].

Regla dura: **`parse` es una función pura**, separada del fetch. Permite testear con fixtures sin red y re-parsear el histórico cuando una fuente cambia su markup, sin volver a scrapear.

Los conectores solo se ejecutan desde `app/api/**`, nunca desde el cliente.

## 7 · Convenciones (heredadas de yonder)

- Arquitectura **feature-driven**, smart/dumb: `<Feature>Page.jsx` orquesta, `components/` son dumb, `hooks/use<Feature>.js` tiene la lógica.
- DI por Context, no prop drilling profundo.
- Kit de UI de marca en `src/components/common/` — no reinventar inline (ver [[DESIGN]] §Patrones obligatorios).
- i18n propio: claves en inglés, valores en español, en `src/i18n/messages/es/`.
- Aliases: `@`, `@features`, `@components`, `@hooks`, `@contexts`, `@hocs`, `@theme`, `@libs`, `@utils`, `@schemas`, `@constants`, `@mocks`, `@core`, `@connectors` (ver `jsconfig.json`).
- Commits Conventional en español; `feature/*` → `dev` con `--no-ff`.

## 8 · Cohesión/acoplamiento y SOLID

- Un concepto de dominio (repuesto, cotización, embarque) vive en un solo lugar: su feature. Las pantallas que solo lo muestran (vista general, catálogo transversal) lo consumen vía repository, no duplican lógica.
- El motor de costos es el ejemplo canónico de **Single Responsibility** + **Dependency Inversion**: no conoce Firestore ni la UI; recibe todo lo que necesita como argumento (`params`, `fx`) en vez de leerlo él mismo.
- Los conceptos de costo local (`LocalCostConcept[]`) son **Open/Closed**: agregar un cargo nuevo (p.ej. una tasa portuaria nueva) es agregar un dato a `cost_param_sets`, no tocar código del motor.

## 9 · Errores y estados

- El motor de costos nunca lanza para un caso de negocio esperado (mercancía peligrosa que no puede volar, Form F pendiente): eso es un `blocker` o un `warning` en el resultado, no una excepción. Lanza solo ante **contratos rotos** (moneda desconocida, base de prorrateo inválida) — errores de programador, no de datos del usuario.
- Los route handlers devuelven `{ error: { code, message } }` con status HTTP apropiado; nunca un stack trace crudo al cliente.
- Estados de carga/vacío/error son explícitos en cada feature — no "spinner infinito" ni pantalla en blanco silenciosa.

## 10 · Qué NO hacemos

- No hay ORM ni capa de abstracción sobre Firestore más allá del repository ligero — Firestore ya es simple, un ORM sería una capa sin valor.
- No se scrapea 1688/Alibaba con automatización agresiva (ver [[INTEGRACIONES-CHINA]] §Orden de implementación) — es decisión de negocio, no técnica, y va documentada, no oculta en el código.
- No se hardcodea ninguna tasa fiscal (arancel, IVA) ni tarifa de agente de aduanas — viven en `cost_param_sets`, versionado e inmutable (ver [[MOTOR-DE-COSTOS]]).
- No se usa float para dinero en ningún punto del proyecto — ver `src/libs/money.js` y CLAUDE.md.
- Yonder es 100% cliente y sin tests; este proyecto no lo es (ver §1-2 y [[WORKFLOW]]).
