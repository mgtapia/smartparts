# MANUAL DE MARCA — SmartParts

Extensión de marca de **SmartDeal** ([smartdeal.cl](https://www.smartdeal.cl/)). Los tokens visuales de este documento están extraídos del HTML/CSS de producción del sitio (2026-09-17), no son una aproximación — detalle completo en [[DESIGN]].

## Qué hereda de SmartDeal

- **Paleta**: superficies oscuras casi negras (verde-negro, no neutro puro) + acento verde lima ácido `#C5FF3E` como firma visual, ámbar `#FFC93C` como acento secundario.
- **Tipografía**: Inter, confirmada en el sitio real con rango completo de pesos (400–900).
- **Logo**: `logo-smartdeal-black.svg` / `logo-smartdeal-white.svg` (descargados en `public/assets/brand/`).
- **Tono**: directo, sin letra chica. SmartDeal vende tecnología reacondicionada certificada con esa promesa; SmartParts hereda el mismo espíritu aplicado a repuestos — "esto cuesta X puesto en Santiago, así se calculó, así se compara contra lo que pagás hoy".

## Qué adapta para una herramienta interna de trabajo

SmartDeal es un sitio de **retail** (WooCommerce, catálogo de productos, checkout). SmartParts es una **herramienta interna densa en datos** para un equipo de 2-5 personas. El layout no se copia — se hereda solo la piel visual:

- Navegación por **rail vertical** de módulos (patrón heredado de `yonder`), no un menú de tienda.
- **Data grids** como componente central (`@mui/x-data-grid`), no grillas de producto con fotos grandes.
- Tamaño mínimo de texto más grande (11px) que un sitio de marketing — prioriza legibilidad en tablas sobre impacto visual.
- El acento lima se usa con moderación: CTA puntual, estado activo, highlight — no como fondo extenso, porque en una UI con cientos de filas de datos un acento de alto contraste satura si se usa de más (ver [[DESIGN]] §Pendiente de confirmar).

## Sub-marca

Hoy: logo de SmartDeal + lockup tipográfico "Parts" en Inter Bold al lado, mientras no exista un lockup oficial de sub-marca. Ver [[MEMORY]] §Datos pendientes del usuario.

## Voz y copy

- Español, directo, sin jerga innecesaria — pero el dominio (aduanas, logística) tiene su propio vocabulario técnico legítimo: usarlo bien es parte de la credibilidad de la herramienta ante el equipo de compras. Ver [[GLOSARIO-IMPORTACION]].
- Los números hablan primero: "Ahorrás $X vs. lo que pagás hoy" antes que adjetivos.
- Las alertas y bloqueos (mercancía peligrosa, cotización vencida) son explícitos y directos, nunca ambiguos — un bloqueo dice por qué, no solo que algo falló.

## Estado

**v0.2** — colores, tipografía y logo son reales; falta el lockup oficial de sub-marca y validar el uso del lima en una UI de datos densa con el equipo antes de pulir Fase 1.
