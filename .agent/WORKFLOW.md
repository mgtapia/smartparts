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
- **Commits frecuentes** por tanda, sin esperar a que lo pidan, siempre en una rama de trabajo y siguiendo §Git.
- **Informar con honestidad**: qué se hizo, qué se verificó y qué no (por ejemplo, si no se vio en el navegador).
- **Feedback del usuario que se repite** se guarda como regla: en [[DESIGN]], en CLAUDE.md o en la memoria del agente.
- Para una pantalla nueva sigue la skill `nueva-pantalla` (`.claude/skills/nueva-pantalla/SKILL.md`).

## Git

Reglas para el agente y para cualquiera que trabaje en el repo. Las críticas las hace cumplir `.claude/hooks/check-git.mjs` (PreToolUse sobre Bash): si una orden las rompe, se bloquea y explica por qué.

### Modelo de ramas

- **`main`**: siempre desplegable. Solo recibe fusiones de ramas de trabajo; **nunca se commitea directo en `main`** (ni siquiera docs o `STATUS.md`).
- **Ramas de trabajo**, una por tarea, cortas y sacadas de un `main` al día: `feature/<tema>` (funcionalidad), `fix/<tema>` (corrección), `docs/<tema>`, `chore/<tema>` (herramientas, limpieza), `refactor/<tema>`. Nombre en minúsculas, con guiones y en español (`feature/orden-de-tablas`). No hay rama `dev`: no aporta con un solo equipo y publicamos a mano.
- Una rama = un tema. Si aparece algo ajeno a mitad de camino, va a otra rama (o se anota), no se mezcla.

### Ciclo de una tarea

1. **Partir limpio**: `git switch main && git pull --ff-only`, `git status` sin cambios sueltos y `git switch -c feature/<tema>`.
2. **Trabajar con commits chicos** (ver abajo). Subir la rama de vez en cuando (`git push -u origin feature/<tema>`) como respaldo.
3. **Antes de fusionar**, en la rama y con todo commiteado:
   - `npm run test`, `npm run lint`, `npx prettier --check` **sobre los archivos tocados** y `NEXT_DIST_DIR=.next-verify npm run build` en verde;
   - `.agent/STATUS.md` actualizado;
   - `git diff --stat main...HEAD` revisado: solo lo esperado, sin planillas, capturas ni reformateos masivos.
4. **Fusionar**: `git switch main && git pull --ff-only && git merge --no-ff feature/<tema>` (mensaje: `Merge feature/<tema>: <qué entrega>`), verificar `git log --oneline -5` y `git push origin main`.
5. **Ordenar**: borrar la rama ya fusionada (`git branch -d` y `git push origin --delete`); `-d` solo borra lo fusionado. Nunca `-D` sin confirmar con el usuario. Las ramas y worktrees de subagentes se borran igual al terminar.
6. **Publicar** solo con aprobación explícita del usuario (ver §Publicación): desde `main` ya fusionado y subido, y luego etiquetar lo publicado (`git tag -a deploy/AAAA-MM-DD-N -m "<qué salió>"` y `git push origin <tag>`; `N` empieza en 1 cada día). Así siempre se sabe qué versión está en producción.

Un arreglo urgente sigue el mismo ciclo desde `main` con una rama `fix/<tema>`; solo se acorta el tiempo.

### Commits

- **Conventional Commits en español**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`. Asunto en presente, sin punto, de hasta ~72 caracteres. Cuerpo (cuando el cambio no es obvio) explica el *por qué*, no el *qué*: el diff ya dice el qué. Termina con la línea de atribución vigente.
- **Atómicos**: un commit = un cambio coherente que compila y pasa los tests. Modelo, interfaz y tests de una misma funcionalidad pueden ir juntos; dos funcionalidades no. Si el commit necesita "y" para describirse, se parte.
- **Se agrega por nombre**: `git add ruta/archivo`, nunca `git add -A` ni `git add .` (el hook lo bloquea). Antes de cada commit, `git status` y `git diff --cached --stat`.
- **Formato solo de lo que se toca**: `npx prettier --write <archivos tocados>`, nunca sobre carpetas enteras (mezcla cambios reales con ruido de fin de línea). Si el diff muestra archivos que no se tocaron, se revierten antes de commitear.
- **No se commitea**: planillas, cotizaciones ni listas de precios (van al Drive, ver la memoria del agente), secretos, `out/`, `.next*`, capturas. Nada de archivos de trabajo en `public/`: se publicaría con la web.
- Un cambio de fórmula del motor de costos que altere un golden test se justifica en el cuerpo del commit (ver [[MOTOR-DE-COSTOS]] §Reproducibilidad).

### Prohibido (el hook bloquea lo marcado con *)

- Commitear en `main`.*
- `git push --force` o `--force-with-lease`.*
- `--no-verify` y `--no-gpg-sign`: si un hook falla, se arregla la causa.*
- `git add -A`, `git add .`, `git add -u`.*
- `git reset --hard`, `git clean -f`, `git checkout -- .`, `git restore .` y `git branch -D` sin confirmar con el usuario.*
- Reescribir historia ya subida (`rebase`, `commit --amend` sobre commits publicados).
- Dejar trabajo sin commitear al terminar una tanda, o commits de "wip" en `main`.

### Publicación

Sigue igual: nunca `firebase deploy` por iniciativa propia (ver arriba y CLAUDE.md). El deploy es manual; subir a `main` no publica nada.

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

## No tocar `.next` mientras corre `yarn dev`

El servidor de desarrollo del usuario usa `.next`. Cualquier comando que escriba ahí (incluido `next lint`, que guarda caché y tipos en la carpeta de compilación) rompe su compilación en caliente ("Cannot read properties of undefined (reading 'call')", "Could not find the module … in the React Client Manifest"). Por eso `npm run lint` usa `.next-verify` (`scripts/lint.mjs`), las verificaciones de compilación llevan `NEXT_DIST_DIR=.next-verify` y la publicación usa `out/`. Nunca ejecutar `next build`, `next lint` ni `next dev` sin otra carpeta de compilación. Para levantar un servidor de prueba: `NEXT_DIST_DIR=.next-devtest npx next dev -p 3100`, y apagarlo al terminar.

**Causa real de los errores en `yarn dev` (2026-09-25):** con `output: 'export'`, Next compila SIEMPRE en `.next` (`distDir` solo indica dónde queda el HTML final; ver `node_modules/next/dist/build/index.js`, donde fuerza `config.distDir = '.next'`). Un `build:hosting` mientras corre `yarn dev` pisaba la carpeta del servidor. Por eso `scripts/build-hosting.mjs` compila en una copia del proyecto, en una carpeta hermana con `node_modules` enlazado, y solo trae de vuelta `out/`. No volver a ejecutar `NEXT_OUTPUT=export next build` directo en el proyecto.

## Publicar

Publicar en https://smartdeal-parts.web.app lo aprueba el usuario, no el agente. Flujo: cambio en una rama o commit local → `npm run test`, `npm run lint`, `npx prettier --check .`, `NEXT_DIST_DIR=.next-verify npm run build` → el usuario lo ve en su servidor de desarrollo y lo valida → el usuario aprueba → con la rama ya fusionada a `main` y subida, `npm run build:hosting` y `firebase deploy --only hosting`, y se etiqueta lo publicado (`deploy/AAAA-MM-DD-N`, ver §Git). Las reglas de Firestore (`firestore.rules`) y los índices siguen el mismo flujo.
