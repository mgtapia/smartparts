# 🔧 SmartParts — Importación de repuestos EV, China → Chile

> **SmartParts** — extensión de marca de [SmartDeal](https://www.smartdeal.cl/).
> *Repuestos originales y alternativos, con el costo real puesto en Santiago, en un click.*

Plataforma para importar y revender repuestos de vehículos eléctricos desde China. Une catálogo, cotizaciones de proveedores chinos, motor de costeo (landed cost) y estadísticas en un solo lugar. Cliente inicial: arrendador de flota EV para conductores de apps, 840 vehículos, 4 modelos — tres de ellos marcas chinas con red de repuestos delgada en Chile.

> Estado: **Fase 0 — andamiaje y documentación**. Ver [`.agent/STATUS.md`](.agent/STATUS.md) para el detalle vivo.

## 📋 Documentación

- [`CLAUDE.md`](CLAUDE.md) — no-negociables del proyecto.
- [`.agent/`](.agent/) — gobernanza para agentes: [MEMORY](.agent/MEMORY.md) (hechos persistentes) · [ARCHITECTURE](.agent/ARCHITECTURE.md) · [DESIGN](.agent/DESIGN.md) · [ROADMAP](.agent/ROADMAP.md) · [STATUS](.agent/STATUS.md) · [WORKFLOW](.agent/WORKFLOW.md).
- [`docs/`](docs/) — dominio: [PRD](docs/PRD.md) · [Modelo de datos](docs/MODELO-DE-DATOS.md) · [Motor de costos](docs/MOTOR-DE-COSTOS.md) · [Integraciones China](docs/INTEGRACIONES-CHINA.md) · [Seguridad y roles](docs/SEGURIDAD-Y-ROLES.md) · [Glosario](docs/GLOSARIO-IMPORTACION.md) · [Manual de marca](docs/MANUAL-DE-MARCA.md).

## 🧱 Stack

- **Next.js 15** (App Router) + **React 19**, JavaScript puro (sin TypeScript).
- **Material UI 6** + Emotion, **MUI X Charts** + **MUI X Data Grid**.
- **Firebase 11**: Auth (Google) + Firestore + Storage. `firebase-admin` en el servidor.
- **Formik + Yup** para formularios y validación.
- **Vitest + fast-check** — tests unitarios y property-based del motor de costos.

## 🎯 Pilares

1. **Motor de costos real**: FOB → flete → seguro → CIF → arancel → IVA → gastos locales, con peso volumétrico, prorrateo por resto mayor y costo de inmovilización de flota como variable de primera clase.
2. **Catálogo con auditoría**: importa la planilla real del cliente y reporta anomalías (códigos faltantes, precios duplicados) en vez de corregirlas en silencio.
3. **Sourcing en China**: 1688, Alibaba, AliExpress, Made-in-China — capa de conectores con el mismo contrato, priorizando importación manual y captura asistida antes que scraping agresivo.
4. **Reventa, no solo importación**: margen y lista de precios por cliente son núcleo del producto.
5. **Decisión barco vs. avión con datos reales**: el sobrecosto aéreo se compara contra el costo medible de un vehículo detenido, no contra una corazonada.

## 🚦 Próximos pasos

Scaffolding (Fase 0) → núcleo navegable con mocks reales del cliente inicial (Fase 1) → Firestore + importador + roles (Fase 2) → sourcing automatizado (Fase 3) → operación completa (Fase 4). Detalle en [`.agent/ROADMAP.md`](.agent/ROADMAP.md).

## Desarrollo

```bash
npm install
npm run dev            # http://localhost:3000
npm run test           # motor de costos (Vitest)
npm run lint && npx prettier --check .
```
