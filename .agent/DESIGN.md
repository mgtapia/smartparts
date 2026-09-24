# DESIGN — SmartParts

Sistema visual y mapeo diseño → código. **Colores, tipografía y logo extraídos del sitio real** [smartdeal.cl](https://www.smartdeal.cl/) (HTML/CSS de producción, 2026-09-17) — no son una aproximación. El **layout** en cambio no se copia de smartdeal.cl (es retail WooCommerce, no aplica a una herramienta interna de datos): se hereda el patrón de `yonder` (rail + data grid), solo con la piel visual de SmartDeal.

## Identidad

Extensión de marca de SmartDeal: superficies oscuras casi negras con un acento **verde lima ácido** de alto contraste — directo, sin letra chica, orientado a decisión rápida con números reales. El lima es el color más repetido del sitio (69 ocurrencias en CSS de producción): es la firma visual de la marca, no un acento cualquiera.

## Logo

Assets reales descargados en `public/assets/brand/`:
- `logo-smartdeal-black.svg` — sobre fondos claros.
- `logo-smartdeal-white.svg` — sobre fondos oscuros (navy/negro — el uso más común dado el chrome oscuro de la marca).
- `favicon-smartdeal.svg` — favicon de la app.

**SmartParts es una sub-marca**: mismo isotipo/wordmark de SmartDeal + lockup "Parts" tipográfico en Inter Bold al lado, hasta que llegue un lockup oficial (ver [[MEMORY]] §Datos pendientes).

## Tokens (extraídos de smartdeal.cl)

| Rol | Hex | Uso |
|---|---|---|
| **Lima** (acento primario) | `#C5FF3E` | CTA principal, elementos activos, highlight — el color de marca |
| Lima hover/press | `#3F5A17` (oscuro, para texto/ícono sobre lima) | — |
| Ámbar (acento secundario) | `#FFC93C` | badges, destacados secundarios, ranking de ahorro |
| **Chrome** (rail, header, drawer) | `#000000` (negro puro) | Corrección de UI (2026-09-17): `#14200A` (el "negro" real de la marca) se probó en el rail y se leía como verde musgo en una superficie grande — se usa negro puro para chrome, aunque no sea el hex exacto de smartdeal.cl. `COLORS.chrome` en `src/constants/colors.js`. |
| Tinta (texto/detalle, NO superficies grandes) | `#14200A` (verde-negro) · `#101418` · `#0F1114` | el "negro" de marca real, uso puntual — nunca en un panel grande (ver Chrome arriba) |
| Superficie oscura alterna | `#12171B` / `#1B2229` | cards sobre fondo oscuro |
| Texto sobre claro | `#333333` (primario) · `#6d6d6d` (secundario) | — |
| Fondo claro | `#FFFFFF` / `#F3F4EF` (cálido) / `#f8f8f8` | página, cards |
| Borde | `#eeeeee` / `#e5e7eb` / `#d5d5d5` | — |
| Éxito | `#059669` / `#166534` | ahorro positivo, cotización confirmada, FTA aplicado |
| Advertencia | `#f97316` | cotización por vencer, UN38.3 pendiente |
| Error / bloqueo | `#dc2626` (texto/ícono) sobre `#FFF0F0` (fondo) | vehículo detenido, blocker de mercancía peligrosa |
| Info | `#F0F7FF` (fondo) | tooltips y notas informativas |
| Gris muted | `#8B968A` / `#B9C2B4` | texto terciario, placeholders — nota el sesgo verdoso, coherente con el resto de la paleta |

Definidos en `src/constants/colors.js`, mapeados en `src/theme/theme.js` con `colorSchemes` light/dark de MUI. **No usar hex sueltos en componentes.**

> Nota de contraste: `#C5FF3E` sobre blanco no cumple WCAG AA para texto — se usa como fondo de botón/chip con texto oscuro (`#14200A`) encima, o como acento de borde/ícono, nunca como color de texto sobre fondo claro.

## Tipografía

- **Inter** — confirmada como fuente de UI/cuerpo del sitio real (cargada con el rango de pesos 400–900, el uso más amplio). Títulos, cuerpo, UI. Sans, alta legibilidad en tablas densas.
- **Roboto Mono** — códigos OEM, montos, IDs. La legibilidad de un código como `B004163` importa: nunca en la fuente de cuerpo. (No hay equivalente mono en el sitio de retail; se agrega porque el dominio lo exige.)
- Tamaño mínimo de texto: **11px** (más grande que yonder — esto es una herramienta de trabajo con tablas, no una app de consumo).
- Radios de borde observados en el sitio real, se heredan tal cual: `999px` (pills/badges), `12–16px` (cards), `6–10px` (inputs/botones chicos).

## Iconografía

`@mui/icons-material` como base (sin set bespoke, a diferencia de yonder) — prioriza velocidad de desarrollo sobre identidad visual fuerte en v0.1. Íconos semánticos por dominio: 📦 repuesto, 🚚 embarque, 🏭 proveedor, 📋 cotización.

## Navegación: rail vertical de 12 módulos

Mismo patrón de `AppRail` que yonder (columna izquierda, flyout al hover), sin las 6 zonas agrupadas — acá los módulos son planos porque el dominio es más chico:

**Dashboard · Vehículos · Catálogo · Repuestos · Proveedores · Cotizaciones · Sourcing · Costeo · Embarques · Clientes · Precios · Importar · Ajustes**

`Precios` visible solo para roles con permiso de ver margen (ver [[SEGURIDAD-Y-ROLES]]).

## Patrones obligatorios (heredados de yonder, CUMPLIR SIEMPRE)

1. **Ancho de contenido**: `<ContentWidth>` de `@components/common`, `MAX_WIDTH` de `@constants/layout`. Prohibido `sx={{ maxWidth, mx:'auto' }}` inline.
2. **Color**: solo tokens de `@constants/colors`.
3. **Espaciado**: `GRID_GAP`/`SIDEBAR_GAP`/`LIST_GAP` de `@constants/layout`.
4. **Componentes comunes** (`@components/common`): `PageHeader`, `StatCard`, `SectionLabel`, `Pill`/`Tag` (para `code_status`, `demand_basis`, estados de cotización), `MoneyValue` (formatea un `Money` — nunca `toFixed()` inline en un componente), `PaperCard`.
5. **Tablas y listas**: el **catálogo es la referencia de diseño** y se mantiene. Se usa `ListTable` (`@components/common`): encabezado `overline`, filas de 44 px, 13 px, **sin negrita**, columnas de ancho base fijo con una principal que se estira. **Ninguna tabla pasa del ancho de la pantalla**: sin scroll horizontal, las columnas se achican con puntos suspensivos. Solo la información clave en la lista; el resto al abrir el detalle o con "Columnas".
6. Antes de escribir `sx` extenso: ¿ya existe un componente? Si no, ¿debería? Si sí → crearlo.

## Estándar de barra de herramientas, modales y textos (2026-09-24)

- **Barra**: buscador (`ToolbarSearch`, 44 px) + selectores (`ToolbarSelectBox`, pastilla de 44 px) + botones de acción (`ToolbarButton`) + **ícono de información al final** (`InfoNote`). Cambiar de vista no es un filtro: va en pestañas de pastilla (`ViewTabs`) bajo el título.
- **`PageHeader`**: `meta` (ej. "592 de 592 repuestos.") en la misma fila del título, a la derecha. No repetir la palabra del título en la pestaña ni en el conteo.
- **Texto adicional**: nunca suelto en la página. Va en un ícono `InfoNote` (popover) o al final de la página. Los datos del proveedor que hay que ver (ej. lo que declara) sí son datos, no ayuda.
- **Modales**: grilla de dos columnas con campos del mismo tamaño (`NumberField`: caption arriba, input de 44 px con prefijo; selectores con `ToolbarSelectBox fullWidth`), botones al pie chicos y con jerarquía (`ModalActionButton`: primario relleno / secundario solo texto). Solo se piden los campos que corresponden a lo elegido (ej. parámetros del modo de transporte seleccionado). No inventar estilos nuevos de input o selector.
- **Etiquetas**: precisas y con el término técnico de importación (Incoterm, W/M, ad valorem % CIF, Formulario F…). El lector es un experto: sin relleno explicativo en la etiqueta.
- **Español**: tipos y estados con etiquetas en español estandarizadas en `@constants/enums` (ej. Fábrica / Distribuidor / Revendedor / Intermediario); calidad con términos universales OEM / AFM.
- **Rojo = no verificado** (ver [[MEMORY]]): `UncertainValue`, con el motivo en un tooltip.

## Layout de anchos

Igual regla que yonder: **máx. 2 tipos**. Ancho fijo (contenido de página, formularios, fichas) y ancho completo (catálogo/repuestos con filtros + data grid, dashboard). La columna central de las vistas full-width igual respeta un `maxWidth` de lectura para los bloques de texto/resumen.

## Espaciado de grids

- Grids de tarjetas (dashboard, catálogo en modo card): `gap: 16px`.
- Sidebars (filtros, resumen de costeo): `gap: 14px`.
- Filas de data grid: densidad `compact` de MUI X Data Grid por defecto (más filas visibles, dominio tabular).
- Separación entre secciones grandes: `mb: 24px`.

## Patrón de ficha (repuesto, proveedor y lo que venga)

Aprobado por el usuario en la ficha de repuesto (`src/features/parts/PartDetailPage.jsx`); las demás fichas lo copian.

1. `PageHeader` con `back` (flecha en la misma fila del título; nunca una fila aparte), título y descripción corta.
2. **Resumen siempre visible**: una tarjeta con la imagen o identificador a la izquierda y un `InfoGrid` (columnas iguales con divisor) con solo los datos que sirven para decidir. Lo importante nunca va escondido.
3. **Tabs** (`ViewTabs`) para agrupar el resto: la más usada primero y activa por defecto. La pestaña activa vive en la URL (`?tab=…`, con `useUrlTab` de `@hooks/useUrlTab`; valores en español) para poder abrirla directo y compartir el enlace. La página que lo usa va dentro de un `<Suspense>` en su `page.js`. Dentro de cada tab, uno o más `InfoGrid`; una lista usa `ListTable`.
4. **Editar y confirmar**: cada dato editable lleva un lápiz (`InfoField onEdit`) que abre un modal. Un dato que se **confirma** exige una **fuente** (chat, proforma, documento, medición). Sin fuente solo se guarda como sin confirmar. Un dato confirmado sale del rojo; corregirlo es una acción explícita, nunca un campo libre.
5. Todo lo no verificado en rojo (`UncertainValue` con el motivo). Un dato sin valor dice "Sin dato" o el motivo concreto, en rojo, nunca un guion mudo.
6. Los costos son estimaciones mientras haya un supuesto: rojo y con la fórmula a la vista.

## Catálogo de componentes comunes (reutilizar antes de crear)

| Necesidad | Componente |
| --- | --- |
| Título con flecha de volver, meta y acciones | `PageHeader` |
| Datos clave en columnas con divisor y lápiz | `InfoGrid`, `InfoField` |
| Agrupar vistas de una página | `ViewTabs` |
| Lista tipo catálogo | `ListTable` |
| Buscador, selector, botón, botón de ícono de barra | `ToolbarSearch`, `ToolbarSelectBox`, `ToolbarButton`, `ToolbarIconButton` |
| Ayuda de una pantalla o modal | `InfoNote` |
| Valor no verificado | `UncertainValue` |
| Modal de edición | `FormDialog`, `DialogField`, `DialogTextInput` |
| Confirmar un dato con su fuente | `SourcedValueDialog` |
| Campo numérico de modal | `NumberField` |
| Botón al pie de un modal | `ModalActionButton` |
| Dinero | `MoneyValue`, `MoneyFromMicros` |

Si algo se repite dos veces con `sx` propio, se convierte en componente común. No se crean estilos nuevos de input, selector, tabla ni botón.

## Reglas de texto

- **Español** en todo lo visible. Solo se dejan en inglés las siglas universales del oficio: OEM, AFM, EXW, FCA, FOB, CIF, HS, MOQ, LCL, UN38.3. Sin anglicismos como "landed cost" o "supplier".
- **Etiquetas**: precisas, de 1 a 3 palabras, con el término técnico correcto. Sin paréntesis salvo una unidad necesaria (`Tarifa aérea (US$/kg cobrable)`). Las opciones de un selector no repiten el nombre del campo.
- **Explicaciones** en un `InfoNote` o al final de la página, nunca sueltas ni entre paréntesis.
- **Sin ayuda de relleno**: un `InfoNote` solo se agrega si dice algo que ni el rojo, ni el tooltip, ni la etiqueta ya dicen. Si repite lo visible, no va.
- **Títulos de sección** de 1 o 2 palabras.
- **Tooltips**: máximo 260 px con texto balanceado (definido en el tema); no se sobrescribe.
- **Tipografía**: 13 px como techo en tablas y fichas, sin negrita.
- **Datos**: toda lectura pasa por `useCachedQuery` (`@hooks/useCachedQuery`, caché en `@libs/queryCache`): un dato ya cargado no se vuelve a leer al cambiar de pantalla, y una escritura llama `invalidateQueries()` en su repositorio. Prohibido un `useEffect` propio que lea Firestore.
- **Carga**: skeletons con la forma de la pantalla (`ListPageSkeleton` para listas, `DetailPageSkeleton` para fichas, en `@components/common/Skeletons`), no un spinner. El spinner (`LoadingState`) queda solo donde no hay una forma que imitar.

## Pendiente de confirmar con el equipo de marca

Colores, tipografía y logo ya son reales (extraídos del sitio en producción, no una aproximación). Lo que sigue abierto:

1. **Lockup oficial "SmartParts"**: hoy es logo SmartDeal + texto "Parts" al lado. Si existe un lockup de sub-marca oficial, reemplazar.
2. **Uso del lima en una herramienta densa en datos**: `#C5FF3E` funciona como acento puntual (CTA, highlight) en un sitio de retail con mucho espacio en blanco. Validar que no sature en una UI con data grids de cientos de filas — si cansa, se reduce su superficie de uso, nunca se cambia el hex.

## Responsive

Baja prioridad para v0.1: es una herramienta interna de equipo (2-5 usuarios), usada mayormente en escritorio. El dominio es tabular y las tablas en móvil son un problema propio — se resuelve por vista cuando haga falta, no genéricamente (ver [[ROADMAP]] §Deuda conocida).
