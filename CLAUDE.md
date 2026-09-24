# Reglas del proyecto — SmartParts (LEER SIEMPRE)

Detalle en `.agent/` ([[ARCHITECTURE]], [[DESIGN]], [[WORKFLOW]], [[MEMORY]]) y `docs/` (dominio). Esto son los **no-negociables** que se cumplen siempre. Si un cambio rompe una regla de acá, la regla gana — se ajusta el cambio, no se hace una excepción silenciosa.

## Heredado de `yonder` (proyecto de referencia)

- Arquitectura **feature-driven**, smart/dumb: `<Feature>Page.jsx` + `hooks/use<Feature>.js` + `components/` + `constants.js`.
- Kit de UI en `src/components/common/` — usarlo, no reinventar con `sx` inline (ver [[DESIGN]] §Patrones obligatorios).
- Solo tokens de `@constants/colors` y `@constants/layout`. Nada de hex ni anchos/espaciados sueltos en componentes.
- i18n propio: claves en inglés, valores en español, en `src/i18n/messages/es/`.
- Componentes y funciones en **inglés**; el copy de UI va en **español**.
- JavaScript + JSDoc, **sin TypeScript**. `checkJs: true` en `jsconfig.json` es el chequeo de tipos.
- Commits Conventional en español; `feature/*` → `dev` con `--no-ff`.

## Propias de este dominio

### El dinero — regla dura

**Nunca un `float` para plata, en ningún punto del proyecto.** Firestore no tiene tipo Decimal — solo float64 — y un error de redondeo acá se propaga a decisiones de compra reales. Todo importe pasa por `src/libs/money.js`:

- Un importe es siempre `{ amount: entero, currency, scale }` (`money()`), nunca un `number` suelto.
- Los cálculos internos usan **micros** (enteros, `toMicros()`/`fromMicros()`), nunca decimales de punto flotante.
- Los porcentajes son enteros en **basis points** (`4120` = 41,20%), nunca `0.412`.
- Repartir un total entre líneas siempre usa `allocateByWeights()` (método del resto mayor) — garantiza `Σ líneas === total` exacto, sin "diferencia de redondeo" mostrada en la UI.
- El motor de costos calcula y devuelve todo en **USD** (así liquida Aduana Chile). La conversión a CLP para la UI es un paso de presentación en `src/libs/fx.js`, nunca dentro de `src/core/costing/`.

### Ninguna tasa fiscal hardcodeada

Arancel ad valorem, IVA, umbrales y tarifas de agente de aduanas **cambian por ley**. Viven en `cost_param_sets` (Firestore), **inmutable** — corregir una tasa es crear una versión nueva, nunca editar la vigente. Un literal `0.19`, `1.19`, `0.06` o equivalente fuera de `src/constants/` o `src/core/costing/` está prohibido y el hook de convenciones lo bloquea (ver abajo).

### El motor de costos es una función pura

`src/core/costing/` no importa React, Firebase, ni hace red. Entra un `CostingInput`, sale un `CostingResult` (contrato en `types.js`). Solo puede importar `src/libs/money.js`. Cualquier cambio a una fórmula que altere un golden test (`src/core/costing/engine.test.js`) exige justificación explícita en el commit — nunca "ajustar el test para que pase" (ver [[MOTOR-DE-COSTOS]] §Reproducibilidad).

### Mercancía peligrosa: bloqueo, no advertencia

Si una línea con batería de litio (Clase 9) no puede ir en el modo de envío elegido, el motor devuelve un `blocker`, no un número. Producir un costo aéreo para algo que no puede volar es peor que no producirlo (ver `src/core/costing/dgBlocker.js`).

### La capa de conectores

`src/connectors/` — un archivo por fuente china, mismo contrato (`search`, `getProduct`, `getPricingTiers`, `parse`, `healthCheck`). `parse` es siempre una función pura, separada del fetch. Los conectores solo se ejecutan desde `app/api/**`, nunca desde el cliente (ver [[INTEGRACIONES-CHINA]]).

### Backend propio

`app/api/**` con route handlers + `firebase-admin` es obligatorio para: ejecutar conectores (el scraping no corre en el browser), jobs de tipo de cambio, y escrituras privilegiadas (parámetros arancelarios, roles). `firebase-admin` solo se importa ahí o en `src/libs/admin/`.

### Tests obligatorios en el motor de costos

Yonder no tiene tests — este proyecto sí, en `src/core/costing/`. Es una función pura: barato de testear, caro no hacerlo. Golden test de referencia + property-based tests de las invariantes de suma (`npm run test`, Vitest + fast-check).

### UI y datos (aprobadas por el usuario, no se negocian)

- **Solo datos reales.** Nada inventado en Firestore ni en la UI: los mocks viven solo en tests. Un valor sin fuente no se muestra como dato.
- **Rojo = no verificado**, siempre, con el motivo (`UncertainValue`). Confirmar un dato exige fuente y lo saca del rojo.
- **Reutilizar antes de crear**: catálogo de componentes y patrón de ficha en [[DESIGN]]. Rediseñar bien, no parchar.
- **Español** salvo siglas universales; etiquetas precisas y sin paréntesis de relleno; explicaciones en un `InfoNote`.
- **Nunca auto-confirmar** `part_type: 'original'` ni aceptar un código sin fuente citable.
- **Tareas grandes se planifican antes** y se commitean por tanda.

## Hook de convenciones

`.claude/hooks/check-conventions.mjs` (PostToolUse en `Edit|Write`) bloquea automáticamente:
- Tasa fiscal hardcodeada fuera de `src/constants/` o `src/core/costing/`.
- Literal decimal asignado a una variable `price`/`cost`/`amount`/`total`/`fee`/`freight` — indicio de aritmética de dinero con floats.
- Hex inline en componentes/vistas.
- Ancho de página inline (usar `<ContentWidth>`).
- Componente/función con nombre en español.

Sin este hook, este archivo es una carta de intenciones. El hook es lo que hace que las reglas sobrevivan a sesiones futuras, humanas o de agente.

## Antes de dar por cerrada una tanda de trabajo

1. `npm run test` verde (motor de costos).
2. `npm run lint` y `npx prettier --check .` limpios.
3. `NEXT_DIST_DIR=.next-verify npm run build` → *Compiled successfully*.
4. Actualizar `.agent/STATUS.md`.

Detalle completo del flujo de trabajo en [[WORKFLOW]].
