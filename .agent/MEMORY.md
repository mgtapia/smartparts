# MEMORY — SmartParts

Hechos persistentes del proyecto. Para handoff entre sesiones de agente (humano o IA).

## Producto

**SmartParts** — línea de negocio nueva de **SmartDeal** ([smartdeal.cl](https://www.smartdeal.cl/), hoy retailer de tecnología reacondicionada certificada en Chile): importación y reventa de repuestos para vehículos eléctricos, comprados en China y vendidos en Chile.

**Cliente inicial**: arrendador de vehículos eléctricos a conductores de aplicaciones de transporte. Flota real: **840 vehículos**, 4 modelos:

| Modelo | Unidades | Origen | Rotación (casi 0/rara vez/a veces/casi siempre) |
|---|---:|---|---|
| Dongfeng E70 | 470 | China | 5 / 10 / 20 / 50 |
| Neta Aya | 150 | China | 3 / 6 / 12 / 30 |
| Kia Niro EV | 150 | Corea | 2 / 4 / 8 / 20 |
| Dongfeng Nammi | 70 | China | 2 / 2 / 4 / 10 |

Tres de cuatro marcas son chinas → red de repuestos delgada en Chile → precio alto y plazo largo por canal local → oportunidad de negocio.

**Por qué existe la plataforma**: es flota de ride-hailing — un vehículo detenido esperando repuesto deja de generar ingreso todos los días. El lead time es plata medible, no una molestia logística. Por eso el motor de costos trata el **costo de inmovilización diario** como variable de primera clase, no como un extra.

**El producto gira en torno al repuesto, no a la flota** (corrección del usuario, 2026-09-17): la flota (4 modelos, 840 unidades, escala de rotación) es un dato de contexto que vino en la planilla real y hoy alimenta `demand_scale`/`demand_basis: 'estimated'`, pero no es el KPI principal ni el eje organizador del producto — eso son los repuestos, sus cotizaciones y su costo. Consecuencias concretas:
- El dashboard lidera con métricas de repuestos (ahorro, cobertura de cotizaciones, anomalías), no con "vehículos en flota".
- El módulo `vehicles` es dato de referencia (qué modelos existen, para filtrar/compatibilidad), no la fuente de verdad de la demanda.
- Dirección a futuro, no implementada todavía: `demand_basis: 'historical'` a partir de **repuestos efectivamente pedidos** por el cliente (una "solicitud" real) reemplaza la estimación por rotación de flota en cuanto exista ese historial — es más fiel a lo que el usuario quiere medir. Candidato para Fase 2, junto con el importador real.

**Límite explícito (corrección del usuario, 2026-09-17): SmartParts no gestiona flota ni taller.** No es un fleet management ni un workshop management. `vehicles/` existe solo como dato de **compatibilidad** (qué modelos aplican a qué repuesto), no como módulo operativo de mantenimiento, salud de flota o agenda de taller. Por esto mismo, **`Info app taller tucar` (registro de consumo del taller) deja de ser una prioridad a revisar** — no vamos a construir sobre datos de taller. Si en el futuro se necesita un dato de demanda más fino que la rotación estimada, sale de **solicitudes de compra reales del cliente**, no de integrar su sistema de taller.

## Repositorio

- **Local**: `D:\User\Documents\Git\smartparts` (renombrado desde `repuestos` el 2026-09-17).
- **Remoto**: `https://github.com/mgtapia/smartparts` (renombrado el 2026-09-17, alineado con el nombre local).
- **Firebase**: proyecto `smartdeal-parts` ya creado en GCP/Firebase console. Credenciales de cliente cargadas en `.env.local` (gitignored) el 2026-09-17. **Faltan las credenciales de `firebase-admin`** (service account) para los route handlers — `FIREBASE_ADMIN_CLIENT_EMAIL` y `FIREBASE_ADMIN_PRIVATE_KEY` en `.env.local.example` siguen vacías.

## Etapa actual del negocio (2026-09-17)

El flujo que hay que habilitar primero: **cotizar en China → calcular el costo real puesto en Chile (landed cost) → aplicar margen → ofrecerle un precio al cliente inicial**, con **precio unitario y precio por volumen** (a mayor cantidad, mejor precio — coherente con el prorrateo de flete entre más líneas, ver [[MOTOR-DE-COSTOS]]). Esto es lo que hace que la plataforma cierre el negocio, no solo calcule costos.

Prioridad concreta que esto marca sobre el roadmap de pantallas: `costing` (landed cost) y `pricing` (margen → precio de venta unitario/por volumen) son el corazón del MVP ahora mismo — más que el detalle de flota o el sourcing automatizado. Ver [[PRD]] §Features priorizadas (⭐⭐⭐ Margen y lista de precios por cliente).

## Decisiones de stack y dominio (confirmadas con el usuario)

| Decisión | Valor |
|---|---|
| Proyecto de referencia | `D:\User\Documents\Git\yonder` — se hereda stack, arquitectura y sistema documental |
| Modelo de negocio | Reventa/distribución (no solo importación para uso propio) |
| Moneda de decisión | CLP en UI; motor de costos calcula internamente en **USD** (así liquida Aduana Chile); CNY se normaliza a USD en el borde |
| País de destino | Chile |
| Base de datos | Cloud Firestore |
| Lenguaje | JavaScript + JSDoc + Yup — **sin TypeScript**, igual que yonder |
| Usuarios | Equipo 2-5 con roles (admin/comprador/consulta), Firebase Auth + custom claims |
| Fuentes chinas | 1688, Alibaba, AliExpress, Made-in-China/Global Sources — **prioritarias, no exclusivas** (ver abajo) |

**Sourcing no está cerrado a China** (corrección del usuario, 2026-09-17): China es la fuente prioritaria porque 3 de 4 marcas de la flota inicial son chinas, pero el modelo de datos es agnóstico de país (`suppliers.country` libre, `platform: 'other'`). Importa sobre todo por dos razones: (1) repuestos **originales** suelen conseguirse mejor en el país de origen del fabricante — Corea para Kia, no China; (2) si el catálogo de vehículos se **amplía más allá de los 4 modelos actuales**, cada marca nueva trae su propio país óptimo. Ver [[INTEGRACIONES-CHINA]] y [[PRD]].

Ver [[ARCHITECTURE]] para las divergencias deliberadas vs. yonder (backend propio, tests obligatorios en el motor de costos, data grid, Security Rules versionadas) y su justificación.

## Fuente de datos real

Planilla del cliente inicial con los repuestos, códigos y precios netos (sin IVA) que paga hoy por marca. Es el **baseline** contra el que se mide el ahorro. Ubicación: carpeta de Drive del proyecto, Google Drive file ID (vía MCP `Google Drive`): `1fFY3SKMBXxH4Td8ZcYd8jE1TzT1nuZiKSvsR2WMW91M`. Columnas: `Pieza | Categoría | Lugar | Modelo | Código | Precio neto | Cantidad estimada | Total estimado`.

También existe un **registro del taller del cliente** (archivo aparte, en la misma carpeta de Drive). **Descartado como fuente** (2026-09-17): SmartParts no gestiona taller (ver §Límite explícito arriba) — no se revisa. Si hace falta afinar la demanda más allá de la estimación por rotación, la fuente es una solicitud de compra real del cliente, no su sistema de taller.

Hechos clave que la planilla ya fija (detalle en [[PRD]] y [[MODELO-DE-DATOS]]):
- Taxonomía nivel 1 ya existe y es del cliente inicial: `Carrocería` · `Mecánica` · `Electricidad`. No inventar una nueva.
- `Lugar` (Frontal/Trasera/Conductor/Copiloto/Piloto) es **posición**, no categoría — va al puente `part_vehicle`.
- Catálogo dominado por piezas de carrocería (parachoques, puertas, ópticos, tapabarros), no por desgaste — consistente con ride-hailing urbano. El peso volumétrico domina el flete.
- Anomalías reales encontradas: códigos `SIN CODIGO`, mismo código con dos precios distintos, mismo código para lado derecho/izquierdo. El importador debe **reportarlas, nunca corregirlas en silencio**.

**Códigos de la planilla ≠ código de fábrica de Dongfeng (2026-09-21)**: al cotizar repuestos Dongfeng E70 con un proveedor chino, varios códigos "confirmados" fueron rechazados ("can't find these part numbers in the Dongfeng system"). Investigado con evidencia real (no solo preguntándole a un chat de IA — ver nota de proceso abajo): `code_status: 'confirmed'` nunca significó "verificado contra Dongfeng", solo "así lo escribió el cliente" (`source: 'client_baseline'`, `scripts/seed-firestore.mjs:169`). El VIN de la planilla (`LDP31B962RG321629`) es real y corresponde al Dongfeng Fengshen E70 (verificado en 17vin.com). Los códigos mismos probablemente **no son el número de parte interno de fábrica** (por eso el proveedor doméstico no los reconoce) sino identificadores del circuito de exportación/aftermarket — confirmado para al menos un código, que el usuario encontró con match real buscándolo directo en el buscador interno de AliExpress. Sin confirmar para el resto de las 143 piezas Dongfeng E70. Plan de trabajo y metodología completa: `C:\Users\User\.claude\plans\peppy-riding-meadow.md`.

**Nota de proceso — no confiar en respuestas de IA sin cita verificable**: en esta investigación, tanto Gemini como el "Vision general" de Google dieron respuestas específicas y seguras (traducciones al chino, códigos de fábrica con formato `2906140-SA01`) sin ninguna fuente real detrás — verificado buscando esos mismos términos de forma directa y no apareciendo en ningún resultado indexado. La única evidencia que resultó sólida fue una búsqueda directa del código en el buscador interno de una plataforma real (AliExpress), no la respuesta de un chat. Aplica a cualquier investigación futura de códigos/SKU: pedir siempre la fuente citable, y si no la hay, no tratarlo como dato verificado.

**Planilla completa importada (2026-09-17)**: `src/mocks/parts.js` pasó de un subconjunto curado de 22 filas a las **592 filas reales de las 4 marcas** (Dongfeng E70, Kia Niro EV, Nammi Básico+Full, Neta Aya — 1 fila se descartó por no traer precio neto). `weight_g`/`volume_cm3` para las filas nuevas son heurística por palabra clave en el nombre (ver comentario en `parts.js`), no medición — mismo criterio de "estimado, no inventado silenciosamente" que ya regía. Con el dataset completo, `computeAnomalies()` reporta **60 códigos faltantes** y **~70 `duplicate_position`** (la mayoría son pares DER/IZQ compartiendo un mismo código OEM — puede ser un error de la planilla o puede ser que el proveedor real use un solo código para la pieza simétrica; sin verificar). Pendiente de decisión del usuario: ¿el dashboard debe seguir mostrando cada par DER/IZQ como anomalía individual, o el volumen real ameritó separar "duplicado sin verificar" de "conflicto de precio" (esto sí, sin ambigüedad, es un error real) en la UI?

## Datos pendientes del usuario (no bloquean Fase 0/1, sí Fase 2)

- Costo diario de inmovilización de un vehículo de la flota cliente (o arriendo diario como proxy) — variable central del comparador barco vs. avión.
- Margen objetivo por categoría, para la lista de precios de reventa.
- Confirmar contenido del registro de taller del cliente.
- Proveedores chinos ya contactados, si existen, con sus cotizaciones previas.
- Service account de Firebase Admin.
- API keys de AliExpress/Alibaba, si existen.
- Assets de marca SmartDeal: logo vectorial y hex exactos (hoy inferidos del sitio, ver [[MANUAL-DE-MARCA]]).
- **Decisión bloqueante de negocio**: ¿SmartDeal tiene crédito fiscal de IVA? Define si `landedNet` (sin IVA) o `cashOutlay` (con IVA) es el número principal del comparador — 19% de diferencia.

## Historial de sesiones

- **2026-09-17 (sesión 1)**: plan completo aprobado (`C:\Users\User\.claude\plans\necesito-generar-una-plataforma-sequential-allen.md`). Carpeta renombrada `repuestos` → `smartparts`. Scaffolding inicial: configs base + motor de costos parcial (money, types, weights, allocation, localCosts). Sesión cortada a mitad del rename de carpeta.
- **2026-09-17 (sesión 2, retomada)**: motor de costos completado (`duties.js`, `vat.js`, `dgBlocker.js`, `engine.js`) con suite de tests (golden test + property-based con `fast-check`), **28/28 tests verdes**. `.env.local` real cargado con credenciales de Firebase. Documentación de gobernanza y dominio en curso.
