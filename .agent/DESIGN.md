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
| Tinta / fondo oscuro | `#14200A` (verde-negro) · `#101418` · `#0F1114` | chrome, rail de navegación, headers — el "negro" de la marca es verdoso, no neutro |
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

## Navegación: rail vertical de 13 módulos

Mismo patrón de `AppRail` que yonder (columna izquierda, flyout al hover), sin las 6 zonas agrupadas — acá los módulos son planos porque el dominio es más chico:

**Dashboard · Vehículos · Catálogo · Repuestos · Proveedores · Cotizaciones · Sourcing · Costeo · Embarques · Clientes · Precios · Importar · Ajustes**

`Precios` visible solo para roles con permiso de ver margen (ver [[SEGURIDAD-Y-ROLES]]).

## Patrones obligatorios (heredados de yonder, CUMPLIR SIEMPRE)

1. **Ancho de contenido**: `<ContentWidth>` de `@components/common`, `MAX_WIDTH` de `@constants/layout`. Prohibido `sx={{ maxWidth, mx:'auto' }}` inline.
2. **Color**: solo tokens de `@constants/colors`.
3. **Espaciado**: `GRID_GAP`/`SIDEBAR_GAP`/`LIST_GAP` de `@constants/layout`.
4. **Componentes comunes** (`@components/common`): `PageHeader`, `StatCard`, `SectionLabel`, `Pill`/`Tag` (para `code_status`, `demand_basis`, estados de cotización), `MoneyValue` (formatea un `Money` — nunca `toFixed()` inline en un componente), `PaperCard`.
5. **Tablas**: `@mui/x-data-grid` para todo catálogo/listado tabular — es el dominio central, no se reinventa con `<Table>` de MUI base salvo vistas de detalle de pocas filas.
6. Antes de escribir `sx` extenso: ¿ya existe un componente? Si no, ¿debería? Si sí → crearlo.

## Layout de anchos

Igual regla que yonder: **máx. 2 tipos**. Ancho fijo (contenido de página, formularios, fichas) y ancho completo (catálogo/repuestos con filtros + data grid, dashboard). La columna central de las vistas full-width igual respeta un `maxWidth` de lectura para los bloques de texto/resumen.

## Espaciado de grids

- Grids de tarjetas (dashboard, catálogo en modo card): `gap: 16px`.
- Sidebars (filtros, resumen de costeo): `gap: 14px`.
- Filas de data grid: densidad `compact` de MUI X Data Grid por defecto (más filas visibles, dominio tabular).
- Separación entre secciones grandes: `mb: 24px`.

## Patrón de ficha de repuesto

La pantalla central de la app (ver [[PRD]] §Módulo `parts`). Layout de dos columnas: identidad + specs + fotos a la izquierda (ancho fijo ~380px), tabs de cotizaciones/histórico/vehículos compatibles a la derecha (resto del ancho). El `quote_rollup` (mínimo vigente) siempre visible arriba, sin scroll.

## Pendiente de confirmar con el equipo de marca

Colores, tipografía y logo ya son reales (extraídos del sitio en producción, no una aproximación). Lo que sigue abierto:

1. **Lockup oficial "SmartParts"**: hoy es logo SmartDeal + texto "Parts" al lado. Si existe un lockup de sub-marca oficial, reemplazar.
2. **Uso del lima en una herramienta densa en datos**: `#C5FF3E` funciona como acento puntual (CTA, highlight) en un sitio de retail con mucho espacio en blanco. Validar que no sature en una UI con data grids de cientos de filas — si cansa, se reduce su superficie de uso, nunca se cambia el hex.

## Responsive

Baja prioridad para v0.1: es una herramienta interna de equipo (2-5 usuarios), usada mayormente en escritorio. El dominio es tabular y las tablas en móvil son un problema propio — se resuelve por vista cuando haga falta, no genéricamente (ver [[ROADMAP]] §Deuda conocida).
