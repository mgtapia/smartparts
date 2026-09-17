# STATUS — SmartParts

> Estado vivo de la implementación. Actualizar al cerrar cada tanda de trabajo.
> Última actualización: 2026-09-17.

## ✅ Hecho

- **Repo**: renombrado `repuestos` → `smartparts`, local y remoto (`https://github.com/mgtapia/smartparts`).
- **Tooling**: `package.json`, `jsconfig.json` (aliases), `.prettierrc`, `.prettierignore`, `.eslintrc.json`, `.gitignore`, `.env.local.example`, `.env.local` (credenciales reales de Firebase `smartdeal-parts`), `next.config.mjs`, `vitest.config.mjs`.
- **`npm install`**: exit 0 (649 paquetes). Vulnerabilidades reportadas por `npm audit` sin revisar todavía — no bloquea Fase 0.
- **Motor de costos completo** (`src/core/costing/` + `src/libs/money.js` + `src/libs/fx.js`): `types.js`, `weights.js`, `allocation.js`, `localCosts.js`, `duties.js`, `vat.js`, `dgBlocker.js`, `engine.js` (orquestador `computeCosting()`).
  - **28/28 tests verdes** (`npm run test`): golden test de referencia con caso numérico verificado a mano, tests de `checkDgBlockers` (bloqueo vs. advertencia), y property-based tests (`fast-check`) de las invariantes `Σ líneas === total` y `landedNet`/`cashOutlay`.
  - Decisión de diseño tomada en esta sesión: el motor calcula y devuelve todo en **USD** (no CLP) — así liquida Aduana Chile, y evita romper las invariantes de suma con redondeos de conversión de moneda. CLP es conversión de presentación (`src/libs/fx.js`), no participa del motor.
  - `freightQuote` (flete total cotizado por el forwarder) se agregó a `CostingInput`: el motor prorratea, nunca inventa una tarifa.
- **Documentación `.agent/`**: MEMORY, ARCHITECTURE, DESIGN, ROADMAP, STATUS (este archivo), WORKFLOW.
- **`CLAUDE.md`** y **`README.md`**.
- **Hook de convenciones** (`.claude/hooks/check-conventions.mjs` + `.claude/settings.json`): reglas heredadas de yonder (ancho inline, naming en español) + reglas propias (tasa fiscal hardcodeada, floats en variables de dinero, hex inline en todo el código fuente, no solo vistas).
- **Diseño visual con datos reales**: colores, tipografía (Inter) y logos extraídos del HTML/CSS de producción de smartdeal.cl (no inferidos). Logos descargados en `public/assets/brand/` (`logo-smartdeal-black.svg`, `logo-smartdeal-white.svg`, `favicon-smartdeal.svg`).
- **Documentación `docs/`**: PRD, MODELO-DE-DATOS, MOTOR-DE-COSTOS, INTEGRACIONES-CHINA, SEGURIDAD-Y-ROLES, GLOSARIO-IMPORTACION, MANUAL-DE-MARCA — completos.
- **`src/constants/`**: `colors.js` (tokens reales + `COLORS.chrome` negro puro para superficies grandes, ver nota de diseño abajo), `layout.js`, `routes.js` (13 ítems del rail), `enums.js` (shipping modes, code_status, demand_basis, roles, etc. — alineados con `src/core/costing/types.js` y `docs/MODELO-DE-DATOS.md`).
- **`src/theme/theme.js`**: tema MUI con `colorSchemes` light/dark, tipografía Inter, usando los tokens de `constants/colors.js`.
- **Shell navegable**: `app/layout.js`, `src/providers.js` (Theme + CssBaseline), `app/(app)/layout.js` + `AppShell`/`AppRail` (`src/components/layout/`), placeholders para los 13 módulos (`Placeholder` en `src/components/common/`), `app/login/page.js`, `app/page.js` (redirect a `/dashboard`).
- **Repo commiteado**: 2 commits (`a3ebe37` scaffolding + motor de costos, `8c01d59` app navegable). Identidad de git configurada local al repo (`matiastapia91@gmail.com` / `mgtapia`), no global.
- **Build verde**: `NEXT_DIST_DIR=.next-verify npm run build` → 18 rutas estáticas generadas, ~8s. `npm run lint` y `npx prettier --check .` limpios.

### Nota de diseño (corrección del usuario, 2026-09-17)

El `#14200A` (el "negro" real de smartdeal.cl, verde-negro) se probó como fondo del rail y se leía como verde musgo en una superficie grande — no es lo mismo un acento puntual que un panel entero. Se agregó `COLORS.chrome = '#000000'` (negro puro) para rail/header/drawer/login; `COLORS.ink` queda para uso puntual de texto/detalle. Documentado en [[DESIGN]].

### Nota técnica (bug evitado)

`AppRail.js` importaba `@mui/icons-material` con `import * as Icons from ...` (barrel import) — eso fuerza a webpack a procesar los ~2500 íconos del paquete y estiraba el build a varios minutos sin dar error, solo colgado. Se reemplazó por imports puntuales de cada ícono usado. **Regla a futuro**: nunca `import * as Icons from '@mui/icons-material'` en este proyecto.

### Nota técnica (bug evitado — espaciado en `sx`)

Los tokens de `src/constants/layout.js` (`GRID_GAP`, `SECTION_MARGIN_BOTTOM`, etc.) son px literales, pero MUI multiplica ×8 cualquier número pelado en props de espaciado (`gap`, `m*`, `p*`) del `sx`. Pasar `gap: GRID_GAP` daba 128px en vez de 16px — gaps gigantes en pantalla. Se agregó el helper `px()` en `layout.js`: usar siempre `gap: px(GRID_GAP)` en esas props (`width`/`maxWidth`/`height` no llevan el helper, no se escalan).

### Correcciones de producto (usuario, 2026-09-17) — ver [[MEMORY]] para el detalle completo

- El producto gira en torno al **repuesto**, no a la flota del cliente — el dashboard ya no lidera con "vehículos en flota", lidera con ahorro/cobertura de cotizaciones/anomalías.
- **SmartParts no gestiona flota ni taller.** `vehicles/` es dato de compatibilidad, no un módulo operativo. Se descartó revisar el registro de taller del cliente como fuente de datos.
- **China es sourcing prioritario, no exclusivo** — `suppliers.country` es libre, `platform: 'other'` cubre otras fuentes. Importa para repuestos originales (mejor conseguidos en el país de origen del fabricante) y si se amplía el catálogo de vehículos.
- **Etapa actual del negocio**: cotizar en China → landed cost real → margen → ofrecer precio al cliente (unitario y por volumen). Por eso `costing`+`pricing` son el corazón del MVP ahora, no el sourcing automatizado ni la ficha de vehículo.
- Visión a futuro (no roadmapeada): compra vía API para el cliente, y una plataforma de e-commerce más amplia. Documentado en [[ROADMAP]] §Visión a futuro.

## ⏳ En curso / siguiente inmediato

1. Placeholders restantes (`vehicles`, `suppliers`, `sourcing`, `shipments`, `clients`, `pricing`, `imports`, `settings`) siguen sin feature real — las 5 pantallas estrella del MVP (dashboard, catálogo, ficha de repuesto, comparador de cotizaciones, costeo+precio) ya están wireadas y funcionando contra datos reales.
2. `pricing` como módulo separado todavía no existe — hoy el margen/precio por volumen vive dentro de `costing` (`CostingCalculatorPage`). Evaluar si conviene separarlos o si `costing` YA es la pantalla de pricing que pidió el usuario.
3. Firestore Google Drive: releer `Info app taller tucar` — **descartado**, no se hace (ver corrección de producto arriba).

## ⚠ Bloqueos / dependencias externas

- **Firebase Admin**: falta el service account (`FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`) para route handlers — no bloquea Fase 0/1 (mocks), sí Fase 2.
- Ver [[MEMORY]] §Datos pendientes del usuario para la lista completa (costo de inmovilización diario, margen objetivo, proveedores ya contactados, API keys de sourcing, lockup oficial de marca, definición de crédito fiscal de IVA).

## Notas de verificación

- `npm run test` → **36/36 verde** (28 motor de costos + 8 `partsRepo`, incluyendo detección de las 3 anomalías reales de la planilla). Verificado 2026-09-17.
- `NEXT_DIST_DIR=.next-verify npm run build` → verde, 18 rutas, 5 con feature real (`dashboard`, `catalog`, `parts/[id]`, `quotes`, `costing`). Verificado 2026-09-17.
- `npm run lint` y `npx prettier --check .` → limpios (verificado 2026-09-17).
