---
name: nueva-pantalla
description: Crear o rediseñar una pantalla de SmartParts (lista, ficha o modal de edición) siguiendo el estándar de diseño aprobado. Usar antes de escribir cualquier vista nueva.
---

# Nueva pantalla en SmartParts

Sigue este orden. Los detalles de diseño están en `.agent/DESIGN.md` (patrón de ficha, catálogo de componentes, reglas de texto) y las reglas duras en `CLAUDE.md`.

## 1. Entender antes de escribir

1. Leer `.agent/STATUS.md` y `.agent/MEMORY.md`.
2. Leer la pantalla parecida más reciente: lista = `src/features/catalog/CatalogPage.jsx` o `src/features/quotes/QuotationsPage.jsx`; ficha = `src/features/parts/PartDetailPage.jsx`.
3. Si el cambio es grande o toca el modelo de datos, planificar primero (plan mode) y mostrar el plan. No hacer parches sucesivos.

## 2. Estructura de archivos

`<Feature>Page.jsx` (pantalla), `hooks/use<Feature>.js` (datos), `components/` (modales y piezas propias), `constants.js` (etiquetas, opciones, textos de ayuda). Las lecturas y escrituras a Firestore van en `src/libs/repos/`, nunca en el componente.

## 3. Componer con componentes comunes

Usar `src/components/common/` (catálogo en `.agent/DESIGN.md`): `PageHeader` con `back`, `InfoGrid` + `InfoField`, `ViewTabs`, `ListTable`, `Toolbar*`, `InfoNote`, `UncertainValue`, `FormDialog`, `SourcedValueDialog`, `NumberField`, `ModalActionButton`, `MoneyValue`. Si algo se repite, se vuelve componente común en vez de copiar `sx`.

- **Lista**: buscador + selectores + botones + `InfoNote` al final; `meta` del conteo en el título; filas de 44 px, 13 px, sin negrita; nunca más ancha que la pantalla.
- **Ficha**: resumen siempre visible + tabs para el resto; cada dato editable con lápiz que abre un modal.

## 4. Datos

- Solo datos reales. Un dato sin valor se muestra como "Sin dato" o su motivo, en rojo.
- Confirmar un dato exige una fuente. Sin fuente se guarda sin confirmar.
- Dinero: `{amount, currency, scale}` vía `src/libs/money.js`, nunca un `float`. Sin tasas fiscales hardcodeadas.
- Escrituras masivas en Firestore: script en `scripts/` con dry-run por defecto y `--apply` explícito.

## 5. Texto

Español salvo siglas universales (OEM, AFM, EXW, HS, MOQ…). Etiquetas precisas, sin paréntesis de relleno. Explicaciones en un `InfoNote`. Títulos de sección de 1 o 2 palabras.

## 6. Cierre de la tanda

1. `npm run test`, `npm run lint`, `npx prettier --check .`.
2. `NEXT_DIST_DIR=.next-verify npm run build` con *Compiled successfully*.
3. Actualizar `.agent/STATUS.md` (y `MEMORY.md` si cambió una decisión).
4. Commit en español con la línea de atribución. Informar qué se verificó y qué no (por ejemplo, si no se vio en el navegador).
