# WORKFLOW — SmartParts

Cómo trabajar en este repo (para agentes y humanos).

## Al empezar una sesión

1. Leer [[STATUS]] (qué hay y qué sigue) y [[MEMORY]] (decisiones y hechos persistentes).
2. Si vas a tocar el motor de costos: leer [[MOTOR-DE-COSTOS]] completo antes de cambiar una fórmula.
3. `npm install` si `node_modules` no existe o `package.json` cambió.

## Al escribir código

- **Dinero**: nunca un float. Todo pasa por `src/libs/money.js` (`money()`, `toMicros()`, `fromMicros()`, `allocateByWeights()`). El motor de costos calcula en USD; CLP es solo presentación (`src/libs/fx.js`). Ver CLAUDE.md.
- **Tasas fiscales**: nunca hardcodeadas. Vienen de `cost_param_sets` (`src/core/costing/types.js` → `CostParamSet`). El hook de convenciones bloquea literales sospechosos (`0.19`, `1.19`, `0.06`, etc.) fuera de `src/constants/` o `src/core/costing/`.
- **El motor de costos** (`src/core/costing/`) no importa nada fuera de sí mismo salvo `src/libs/money.js` — si necesitás algo de Firebase o de una feature ahí, la pieza va en otra capa.
- **Acciones que todavía no existen (escrituras a Firestore, confirmar cotización, guardar escenario, exportar, etc.): el botón va deshabilitado (`disabled` + tooltip "Disponible en Fase 2"), nunca oculto.** Así la UI muestra el alcance completo del producto desde Fase 1 sin fingir que algo funciona cuando en realidad no hace nada (o peor, falla en silencio). Se habilita recién cuando la acción está realmente implementada.
- Componentes y features en inglés (naming), copy de UI en español — igual que yonder.
- Antes de un `sx` largo: ¿ya existe el componente en `@components/common`? (ver [[DESIGN]] §Patrones obligatorios).

## Antes de cerrar una tanda de trabajo

1. `npm run test` — el motor de costos debe seguir en verde. Si tocaste una fórmula y un golden test cambió de valor esperado, el cambio necesita justificación explícita en el commit (ver [[MOTOR-DE-COSTOS]] §Reproducibilidad) — nunca "ajustar el test para que pase".
2. `npm run lint` y `npx prettier --check .` limpios.
3. `NEXT_DIST_DIR=.next-verify npm run build` → *Compiled successfully*.
4. Actualizar [[STATUS]] con lo hecho y lo que sigue. Si cambió una decisión de producto o de dominio, actualizar [[MEMORY]].

## Cómo se trabaja con el usuario

- **No actuar sin pedido ni improvisar por partes.** Si un cambio toca diseño o modelo de datos, se rediseña completo: se lee el código, se propone y se aplica de una vez. Sin parches sucesivos.
- **Ante una decisión de fondo** se da una recomendación, no una lista de opciones. Si el usuario ya decidió algo, no se vuelve a discutir.
- **Aplicar todo lo ya conversado** de diseño y de datos (ver [[DESIGN]] y [[MEMORY]]); repetir un error ya corregido es lo que más molesta.
- **Un cambio de datos en Firestore** corre primero en simulación (dry-run), se revisa el resultado y solo entonces se aplica.
- **Commits frecuentes** por tanda, sin esperar a que lo pidan (Conventional Commits en español, con la línea de atribución).
- **Informar con honestidad**: qué se hizo, qué se verificó y qué no (por ejemplo, si no se vio en el navegador).
- **Feedback del usuario que se repite** se guarda como regla: en [[DESIGN]], en CLAUDE.md o en la memoria del agente.
- Para una pantalla nueva sigue la skill `nueva-pantalla` (`.claude/skills/nueva-pantalla/SKILL.md`).

## Mensaje de commit

Conventional Commits en español: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. Cuerpo explica el *por qué*, no el *qué* (el diff ya dice el qué).

## Ramas

`main` (estable) ← `dev` (integración) ← `feature/*`. Merge a `dev` con `--no-ff`. No se pushea a `main` sin pasar por `dev`.

## Gotchas

- El proyecto de referencia `yonder` **no tiene tests y es 100% cliente** — no copiar ese patrón acá. Ver [[ARCHITECTURE]] §10 para las divergencias deliberadas y por qué.
- `firebase-admin` solo se importa desde `app/api/**` o `src/libs/admin/` — importarlo en un componente cliente rompe el build.
- Los importes de Firestore usan `Money` (`{amount, currency, scale}`), nunca `number` suelto para un campo de plata.

## Definición de "hecho" para una feature de Fase 1+

- Pantalla navegable desde el rail, sin error de consola.
- Datos vía repository (`src/libs/repos/`), nunca mocks importados directo en el componente.
- Estados de carga/vacío/error explícitos.
- Si toca dinero: pasa por `money.js`/`fx.js`, nunca un cálculo inline.
- Build y lint verdes.
