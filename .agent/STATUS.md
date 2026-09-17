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

## ⏳ En curso / siguiente inmediato — Fase 2 (arrancada 2026-09-17)

- **Rail de navegación**: ahora solo muestra los módulos con `implemented: true` en `src/constants/routes.js` (dashboard, catalog, parts, quotes, costing) — el resto son placeholders sin feature real y se ocultan de la navegación (la ruta sigue existiendo, no está en el rail). Pedido explícito del usuario.
- **Firebase client + Auth Google**: `src/libs/firebase/client.js` (getters perezosos `getDb()`/`getFirebaseAuth()`/`getGoogleProvider()` — importar el módulo no inicializa nada), `src/contexts/AuthContext.js` (`AuthProvider`/`useAuth`), `RequireAuth` protege `app/(app)/**`, `app/login/page.js` con botón real de Google Sign-In, avatar+logout al pie de `AppRail`. `role`/`canViewMargin` ya se leen del ID token (custom claims) pero todavía nadie los tiene asignados — falta Admin para asignarlos.
- **Security Rules + índices desplegados**: `firestore.rules` (bootstrap: cualquier usuario autenticado puede leer/escribir; la matriz de roles real de `docs/SEGURIDAD-Y-ROLES.md` queda comentada lista para activar cuando haya custom claims), `firestore.indexes.json`, `firebase.json` — desplegados con `firebase deploy --only firestore:rules,firestore:indexes` (proyecto `smartdeal-parts`, modo producción).
- **Firebase Admin configurado y seed corrido**: el usuario generó el service account (Firebase Console → Cuentas de servicio) y lo pegó en `.env.local`. `npm run db:seed` corrió contra Firestore real: 23 repuestos, 10 cotizaciones, 4 vehículos, 4 proveedores, `categories/`, `cost_param_sets/`, `fx_rates/`, `part_vehicle/` y `oem_index/` con las anomalías reales de la planilla.
- **Repositorios migrados a Firestore** (`src/libs/repos/*.js`): `vehiclesRepo`, `suppliersRepo`, `quotesRepo`, `partsRepo` ahora son async y leen Firestore (client SDK) en vez de `src/mocks/`. `computeAnomalies()`/`computeSavingsOpportunities()` quedaron como funciones puras separadas de la lectura, para que sigan siendo testeables sin Firestore (ver nota de tests abajo). Los 5 hooks de feature (`useDashboard`, `useCatalog`, `usePartDetail`, `useQuoteComparator`, `useCostingCalculator`) pasaron de `useMemo` síncrono a `useEffect`+estado con `loading`/`error` explícitos; las 5 páginas usan el nuevo `@components/common/AsyncState` (`LoadingState`/`ErrorState`) antes de renderizar. `categories` sigue siendo un mock estático en memoria (taxonomía chica, no amerita ida y vuelta a Firestore todavía) aunque también quedó sembrada en Firestore para uso futuro de admin.
- **Verificado de punta a punta** con un harness propio (Admin SDK mintea un custom token, el SDK cliente se loguea con él y ejercita los repos reales bajo las Security Rules desplegadas — no vía mocks): `listParts()`, `getPart()`, `listAnomalies()` (las 6 anomalías reales: 3 códigos faltantes, el conflicto de precio B013771, el conflicto 4663002, y el triplicado 5705001), `listSavingsOpportunities()`, `listQuotes()` con proveedor resuelto, y `position` resuelto desde `part_vehicle`. Todo correcto. **Lo único sin verificar soy sin poder hacerlo yo**: el login interactivo de Google en el navegador real (el harness usa un custom token, no el flow de OAuth popup) — pendiente de que el usuario entre a `npm run dev` y haga clic en "Iniciar sesión con Google".
- Placeholders restantes (`vehicles`, `suppliers`, `sourcing`, `shipments`, `clients`, `pricing`, `imports`, `settings`) siguen sin feature real ni repo propio.
- `pricing` como módulo separado todavía no existe — hoy el margen/precio por volumen vive dentro de `costing`.
- Los custom claims (`role`, `canViewMargin`) todavía no se asignan a ningún usuario — falta una pantalla o script de administración (`settings`, Fase 2 más adelante) y decidir quién es `admin` de arranque.

## ⚠ Bloqueos / dependencias externas

- Ver [[MEMORY]] §Datos pendientes del usuario para la lista completa (costo de inmovilización diario, margen objetivo, proveedores ya contactados, API keys de sourcing, lockup oficial de marca, definición de crédito fiscal de IVA).

## Notas de verificación

- `npm run test` → **32/32 verde** (28 motor de costos + 4 `partsRepo`). Bajó de 36 a 32 porque los tests de forma/rollup que llamaban `listParts()`/`getPart()` directo se retiraron (esas funciones ahora hacen I/O a Firestore, no son unitarias) — quedan `computeAnomalies()`/`computeSavingsOpportunities()` como funciones puras testeadas contra los datos reales de la planilla, y la cobertura de I/O real la da el harness de verificación manual, no la suite de Vitest. Verificado 2026-09-17.
- `NEXT_DIST_DIR=.next-verify npm run build` → verde, 18 rutas (5 con feature real: `dashboard`, `catalog`, `parts/[id]`, `quotes`, `costing`; `login` con Auth real). Bundles subieron (ej. `catalog` 180kB→292kB) por el SDK de Firestore/Auth en el cliente — esperado, no revisado como límite todavía. Verificado 2026-09-17.
- `npm run lint` y `npx prettier --check .` → limpios (verificado 2026-09-17).
- Corrección al hook de convenciones (`.claude/hooks/check-conventions.mjs`): la regla de "tasa fiscal hardcodeada" matcheaba `/vat/i` sin límites de palabra, así que el import `Avatar` de MUI (contiene "vat") + cualquier decimal de espaciado (`0.5`, `0.65`) en el mismo archivo disparaba un falso positivo. Se agregó `\b...\b` a la regex.
