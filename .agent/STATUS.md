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

## ⏳ En curso / siguiente inmediato

1. `src/constants/` (colors, enums, layout, routes, costing) y `src/theme/theme.js` con los tokens reales de SmartDeal (ya documentados en [[DESIGN]], falta llevarlos a código).
2. Estructura de carpetas restante (`app/(app)/<módulo>/page.js` placeholders, `src/features/<módulo>/`, `src/mocks/`).
3. Mocks generados a partir de filas reales de la planilla del cliente inicial (ver [[MEMORY]] §Fuente de datos real — no releída todavía en esta sesión, el modelo de datos ya la incorporó en la sesión de planificación).

## ⚠ Bloqueos / dependencias externas

- **Firebase Admin**: falta el service account (`FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`) para route handlers — no bloquea Fase 0/1 (mocks), sí Fase 2.
- Ver [[MEMORY]] §Datos pendientes del usuario para la lista completa (costo de inmovilización diario, margen objetivo, registro de taller del cliente, proveedores ya contactados, API keys de sourcing, lockup oficial de marca, definición de crédito fiscal de IVA).

## Notas de verificación

- `npm run test` → 28/28 verde (verificado 2026-09-17).
- Todavía sin correr: `npm run build`, `npm run lint`, `npx prettier --check .` — pendientes hasta tener algo de UI en `app/`.
