# ROADMAP — SmartParts

Fases de producto. Detalle de features en [[PRD]].

## Fase 0 — Andamiaje y documentación _(en curso)_

Los `.md` de gobernanza y dominio + scaffolding: `package.json`, configs, estructura de carpetas, constantes de dominio, mocks por feature, y el **motor de costos con sus tests** (es puro: se puede construir y verificar sin UI ni base de datos). Sin UI terminada — eso es Fase 1.

Estado detallado y checklist en [[STATUS]].

## Fase 1 — Núcleo navegable con mocks

Shell + rail de navegación (13 módulos, ver [[DESIGN]]), y las pantallas estrella contra mock data con el contrato de props definitivo: catálogo, ficha de repuesto, comparador de cotizaciones, calculadora de costos con desglose, dashboard. Resto de rutas como placeholder.

Los mocks se generan **a partir de filas reales de la planilla del cliente inicial** (ver [[MEMORY]] §Fuente de datos real), no inventados: así el contrato de props se valida contra la forma real del dato desde el primer día y la migración a Firestore no cambia nada de la UI.

## Fase 2 — Datos reales

Firestore + Auth Google + roles por custom claims + Security Rules (ver [[SEGURIDAD-Y-ROLES]]). Repositorios en `src/libs/repos/` reemplazando mocks sin tocar UI.

**Importador de la planilla del cliente inicial**: una hoja por marca, mapeo de columnas, normalización de códigos, y **reporte de anomalías** (códigos faltantes, duplicados con precio distinto, mismo código en piezas de distinto lado — ver [[PRD]] §Importador). Carga manual de cotizaciones.

## Fase 3 — Sourcing automatizado

La capa de conectores, en orden de menor a mayor riesgo técnico (detalle y justificación en [[INTEGRACIONES-CHINA]]):

1. AliExpress (API oficial).
2. Alibaba (Open Platform, si aprueban la app).
3. Made-in-China / Global Sources.
4. 1688 — el más valioso por precio de fábrica real, el más hostil por anti-bot. Con fallback de **captura asistida** (bookmarklet/extensión que extrae el JSON de la página que el usuario ya está viendo logueado) antes que scraping automatizado.

Jobs, caché, rate limiting, traducción y matching de códigos OEM.

## Fase 4 — Operación

Embarques completos, gestión documental (Form F, MSDS/UN38.3), recepción y no conformidades, alertas, stock y punto de reorden por rotación estimada de demanda (nunca gestión de flota o taller — ver [[MEMORY]] §Límite explícito).

## Visión a futuro (mencionada por el usuario, no roadmapeada todavía)

Dos direcciones que el usuario planteó el 2026-09-17, más allá de Fase 4 — quedan acá para no perderse, sin comprometer diseño todavía:

- **Compra vía API**: que el cliente pueda generar órdenes de compra directo contra SmartParts por API, no solo mirar la UI. Implicancia de diseño a futuro: la capa `app/api/**` necesita un contrato pensado para consumo externo (auth de cliente, no solo de usuario interno), no solo route handlers internos para conectores/jobs.
- **Plataforma de e-commerce**: una vitrina de venta más amplia, coherente con el origen retail de SmartDeal. Sin alcance definido todavía — no se diseña el modelo de datos para esto hasta que haya más claridad.

## Deuda conocida desde el día 1

- Responsive: baja prioridad, herramienta interna de escritorio (ver [[DESIGN]]).
- Los valores fiscales del seed de `cost_param_sets` son **provisorios hasta verificación oficial** contra Aduana de Chile / SII (ver [[MOTOR-DE-COSTOS]]).
- El matching automático de código OEM contra listados chinos nunca será perfecto: siempre habrá cola de revisión humana.
- Firebase Admin (service account) sin credenciales todavía — bloquea Fase 2, no Fase 0/1.
