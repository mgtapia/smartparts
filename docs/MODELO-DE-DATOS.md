# MODELO DE DATOS — SmartParts

Firestore. Convenciones generales del proyecto en [[ARCHITECTURE]] y CLAUDE.md.

## Colecciones

**Regla: todo id de documento lo asigna Firestore.** Nunca se inventa un id (`sup_…`, `q_…`, `a__b`, un código, una ruta o una fecha): la clave natural (alias, código OEM, ruta, fecha, archivo de origen) va como **campo** y se busca por consulta. Lo que pertenece a otro documento va en una **subcolección**.

```
vehicles/            los 4 EVs, con flota y escala de rotación; `sourcing_stage` marca el de la etapa actual
  /media/            imagen del vehículo (documento con role: 'main')
categories/          taxonomía; el campo `path` es la ruta materializada (carroceria__frontal__opticos)
parts/               ficha maestra — el documento central (`category_id`, `category_path`, `vehicle_ids`)
  /baseline_prices/  histórico de lo que se paga hoy
  /media/            fotos y documentos (role: 'main' para la foto principal)
  /applications/     aplicación del repuesto a un vehículo: vehicle_id + posición (Frontal/Trasera/Conductor/Copiloto)
oem_index/           centinela de código OEM (campo `code`)
suppliers/           proveedores (China prioritario, no exclusivo — /contacts, /events)
quotations/          una cotización por proveedor y archivo de origen (supplier_id, source_file)
  /lines/            líneas de la cotización: repuesto, calidad, precio, Incoterm, confirmaciones
milestones/          hito hacia la primera OC, un documento por vehículo (vehicle_id)
source_listings/     crudo de los conectores, pre-normalización
connector_runs/      salud de los jobs de sourcing
shipments/           embarques (+ /lines, /events, /documents)
costing_scenarios/   escenarios guardados
cost_param_sets/     parámetros aduaneros versionados e inmutables
fx_rates/            tipos de cambio por fecha
clients/             clientes (razón social, RUT, contacto); los crea el usuario desde la UI
inventory/           stock en Chile por repuesto (`part_id`, `quantity`, `location`); lo carga el usuario desde la UI, una entrada por repuesto
client_orders/       OC del cliente a SmartDeal (client_id, número de OC, fecha, estado, moneda)
  /client_order_lines/  repuesto, cantidad, precio de venta, fulfillment
purchase_orders/     OC de SmartDeal a un proveedor (supplier_id, quotation_id, Incoterm, moneda)
  /purchase_order_lines/  repuesto, cantidad, precio, enlaces a líneas de OC de clientes
aggregates/          rollups del dashboard
audit_log/ users/ translations/
```

## Las cuatro decisiones que sostienen el modelo

### 1. El dinero

Firestore **no tiene Decimal** — solo float64. Todo importe es un mapa `{ amount: entero, currency: 'CLP'|'USD'|'CNY', scale: 0|2 }`, nunca un float (ver `src/libs/money.js`). Los campos que además hay que **filtrar u ordenar** llevan un espejo entero `<campo>_usd_micro` calculado en escritura (Firestore no puede ordenar por un campo dentro de un mapa de forma eficiente con el resto de las queries típicas). Los porcentajes son enteros en basis points (`4120` = 41,20%). El motor calcula en micros enteros; `Number.MAX_SAFE_INTEGER` da margen de sobra para montos en CLP.

### 2. La relación M:N repuesto ↔ vehículo

Híbrida: `parts.vehicle_ids` (array) es la fuente de consulta — viable porque son 4 vehículos, no 400 — y la subcolección `parts/{id}/applications` guarda la metadata de aplicación: la **posición** (columna `Lugar` de la planilla: Frontal/Trasera/Conductor/Copiloto/Piloto — es posición, **no** categoría), el rango de años fino y quién verificó el encaje. Ambas escrituras en la misma transacción, más un job nocturno de reconciliación.

### 3. Firestore no tiene joins

La consulta que define el producto — *"repuestos del Dongfeng E70 con al menos una cotización original bajo USD 50"* — es imposible como join, así que **se precalcula en el documento del repuesto**: `parts.quote_rollup` guarda, por tipo de parte, el mínimo vigente y su ID. La query queda con un solo `array-contains` y una desigualdad, exactamente lo que Firestore permite. El rollup se mantiene con tres redes: transacción en el camino caliente, job de recálculo cuando se borra el mínimo, y reconciliación nocturna que perdona cualquier bug de las dos anteriores.

### 4. Inmutabilidad de lo que ya pasó

Las líneas de embarque congelan un `part_snapshot` y un `quote_snapshot`; los escenarios de costeo congelan el `param_set_id`, el `fx_snapshot` completo y la versión del motor (`engineVersion`). Un precio histórico nunca se sobreescribe: una cotización nueva supersede a la anterior. El histórico de precios es un activo del negocio.

## Regla dura: el ID del documento nunca sale del código OEM

`partId` (y todo ID de documento en general) es el ID auto-generado de Firestore — opaco, estable, nunca derivado del código OEM ni de ningún otro campo de negocio. El código va **solo** como dato dentro de `oem_codes[]`.

Por qué importa acá en particular: la planilla real trae códigos `SIN CODIGO`, códigos duplicados con precio distinto, y el mismo código en piezas físicas distintas (ver [[MEMORY]] §Fuente de datos real). Si el ID del repuesto fuera el código, esas anomalías reales romperían la identidad del documento — dos piezas distintas no podrían coexistir, o una corrección de código más adelante forzaría migrar el documento entero. Con ID opaco, el código es un campo más que se corrige sin tocar la identidad de la pieza; `oem_index/{normalizedCode}` (ver abajo) es lo que detecta la colisión, no la estructura del ID.

Los IDs legibles que aparecen en los ejemplos de este documento y en `src/mocks/` (`part_b013771`, `q_puerta_del_der_alt`) son una conveniencia de desarrollo/mock — en Firestore real son autoIDs (`db.collection('parts').doc().id`).

## Documentos de referencia (forma real, no inventada)

La forma de estos campos sale de la planilla real del cliente inicial (ver [[MEMORY]] §Fuente de datos real), columnas: `Pieza | Categoría | Lugar | Modelo | Código | Precio neto | Cantidad estimada | Total estimado`.

### `parts/{partId}`

```json
{
  "id": "aB3xK9pQr2mZ7vLtYdN1",
  "name_es": "Puerta delantera derecha",
  "name_en": "Front right door",
  "name_zh": null,
  "category_path": "carroceria__frontal__puertas",
  "vehicle_ids": ["dongfeng_e70"],
  "oem_codes": [
    { "code": "B013771", "source": "client_baseline", "role": "local" },
    { "code": "B013771", "code_status": "confirmed", "source": "tachka_ru", "role": "sourcing" }
  ],
  "code_status": "confirmed",
  "weight_g": 18500,
  "volume_cm3": 210000,
  "baseline_price": { "amount": 7390100, "currency": "CLP", "scale": 0, "includes_vat": false },
  "demand_basis": "estimated",
  "demand_scale": "a_veces",
  "quote_rollup": { "original": { "min_usd_micro": null, "quote_id": null }, "alternative": { "min_usd_micro": 45000000, "quote_id": "q_123" } },
  "sourcing_strategy": null,
  "dg_profile": null,
  "created_at": "2026-09-13T00:00:00Z",
  "updated_at": "2026-09-17T00:00:00Z"
}
```

Notas directas de la planilla real:
- `code_status: 'missing'|'provisional'|'confirmed'` — porque hay filas `SIN CODIGO`. Nunca asumir código OEM obligatorio.
- `oem_codes[].role: 'local'|'sourcing'` (2026-09-21) — un repuesto puede tener dos códigos que son hechos distintos: el **local** es el que ya usa el comprador/importador en Chile (nunca se pisa, siempre `source: 'client_baseline'`), el **sourcing** es el que se verificó de forma independiente como reconocible por un proveedor/fábrica (China u otro origen) — puede coincidir en valor con el local o ser distinto. `code_status` a nivel del documento describe la confianza del código de *sourcing*, no del local (ese siempre es "el que tienen"). Ver `getLocalCode()`/`getSourcingCode()` en `src/libs/repos/partsRepo.js` y `.agent/MEMORY.md` §Fuente de datos real — surgió porque un proveedor chino rechazó códigos que sí eran reales en el circuito de exportación, y hacía falta poder decir "esto es lo que usamos acá" y "esto es lo que reconoce el proveedor" sin que uno borre al otro.
- `demand_basis: 'estimated'|'historical'` — la "Cantidad estimada" de la planilla ya es la rotación de flota. Se reemplaza por consumo real cuando exista (registro de taller del cliente, pendiente de revisar — ver [[MEMORY]]).
- `baseline_price.includes_vat: false` explícito — los precios del cliente inicial son netos, pero un baseline futuro de otra fuente puede venir con IVA.
- `sourcing_strategy: 'local_only'` — para componentes donde importar directo no es viable a esta escala (packs de tracción completos), la app debe poder decirlo en vez de mostrar un número engañosamente atractivo.

### `parts/{partId}/applications/{id}`

```json
{
  "part_id": "part_b013771",
  "vehicle_id": "dongfeng_e70",
  "position": "conductor",
  "year_range": [2024, 2025],
  "verified_by": "uid_xxx",
  "verified_at": "2026-09-10T00:00:00Z"
}
```

### `oem_index/{normalizedCode}`

Centinela de unicidad — detecta el caso real encontrado en la planilla: mismo código (`5705001`) usado en tres bisagras distintas de lado derecho/izquierdo, que debería tener códigos distintos.

```json
{ "code": "5705001", "part_ids": ["part_x", "part_y", "part_z"], "flagged_duplicate": true }
```

### `cost_param_sets/{id}` (resumen — contrato completo en `src/core/costing/types.js` → `CostParamSet`)

Inmutable. Cada costeo guardado referencia su `id`, nunca "el vigente" — así uno de hace seis meses se reproduce idéntico.

### `quotations/{quotationId}/lines/{lineId}`

```json
{
  "id": "q_123",
  "part_id": "part_b013771",
  "supplier_id": "sup_456",
  "part_type": "alternative",
  "price": { "amount": 4500, "currency": "USD", "scale": 2 },
  "moq": 1,
  "incoterm": "FOB",
  "source_platform": "1688",
  "captured_at": "2026-09-15T00:00:00Z",
  "valid_until": "2026-10-15T00:00:00Z",
  "match_score": 0.92,
  "match_status": "confirmed"
}
```

Campos que se agregaron al cargar cotizaciones reales: `currency_status` (`confirmed`|`unconfirmed`), `incoterm_place` (lugar nombrado, ej. Guangzhou), `price_tiers[{min_qty, amount}]` (tramos por volumen; `price` = tramo de 1 unidad), `variant` (cuando lo cotizado no calza 1:1 con la ficha, ej. terminal 12 mm / 14 mm), `supplier_item`, `source_file`, `source_raw` (columnas sin interpretar), `shipping_included`, `packaging`, `supplier_declaration`. Las cotizaciones son datos reales de proveedores; no se siembran mocks.

**`suppliers/{id}`** agrega `alias` (nombre corto para mostrar), `supplier_type` (`factory`|`distributor`: quien produce y quien no; declarado por el proveedor, sin verificar), `declarations[]` (lo que dijo textualmente), `is_placeholder`, `contact`.

**`suppliers/{id}.facts`** (ficha del proveedor): datos que se confirman con fuente, cada uno `{ value, source, at }`. Claves: `type`, `formF` (`yes`|`no`), `location`, `founded`, `port`, `airport`, `moq`, `payment`, `leadTime`, `license`. Un dato está **confirmado** si tiene valor y fuente; si no, la UI lo muestra en rojo. `type` se replica en `supplier_type` y `supplier_type_source`. El Formulario F que usa el motor de costos sale de `facts.formF.value`; sin dato se trata como desconocido y se aplica el arancel general. Campos simples sin confirmación: `alias`, `name`, `name_zh`, `contact.*`.

**`quotations/{id}/lines/{id}.inferred`**: `true` en una cotización que el proveedor no hizo: se copia del lado opuesto de la pieza (DER/IZQ) cuando el proveedor cotizó el complementario. Lleva `inferred_from_quote` (id de la cotización original) e `inferred_note`. La UI muestra su precio en rojo con esa nota y el dashboard la cuenta como pendiente. Se generan con `scripts/infer-side-quotes.mjs`, solo para repuestos con código inferido; nunca se crean si el complementario no tiene cotización.

**`quotations/{id}/lines/{id}.confirmations`**: `{ incoterm, incoterm_place, currency }`, cada uno `{ source, at }`. Incoterm, lugar y moneda se confirman por cotización completa (todas sus líneas) desde su detalle; sin registro el dato es del equipo y va en rojo.

**`milestones/{id}`** (un documento por vehículo, con `vehicle_id`): pasos del hito hacia la primera OC que se registran a mano, cada uno `{ value, source, at }`: `chosen_supplier` (id del proveedor elegido), `po_issued` (número de OC) y `invoice_accepted` (número de factura). Un paso cuenta como cumplido solo con valor y fuente. El resto de los pasos del dashboard se calculan de los datos, no se guardan.

**`parts/{id}`**: un solo código, el mismo en Chile y en China. `oem_codes[0]` es el código, `code_status` (`missing`|`provisional`|`confirmed`) y `code_source` su evidencia; confirmar exige fuente citable. Además `hs_code` y `hs_code_source` (partida arancelaria), y la imagen en la subcolección `parts/{id}/media/main` como `data_url` reducido (para no engordar la lectura del catálogo).

**`parts/{id}`** agrega `logistics_status` (`estimated`|`suspect`|`seller_listing`|`supplier_confirmed`|`measured`), `logistics_source` y `logistics_note`: procedencia del `weight_g`/`volume_cm3`. `package_cm` (`[largo, ancho, alto]` en cm) son las medidas del bulto cuando la ficha las trae; sirven para saber si la pieza cabe en un avión de pasajeros.

Regla: **la calidad no se confirma por inferencia.** La calidad que el proveedor indica en su propia cotización (Original/Alternative, OEM/AFM, original/copy) queda confirmada en `confirmations.part_type` con la cotización como fuente (`scripts/confirm-part-types.mjs`, decisión del usuario del 2026-09-25); las cotizaciones inferidas del lado opuesto no. Que un vendedor escriba 原厂 en un listado público no basta — pasar a verificado requiere la cotización del proveedor o una acción humana con foto o muestra (ver [[INTEGRACIONES-CHINA]] §Chino y matching).

### Clientes y órdenes de compra (2026-09-25)

Dos clases de OC enlazadas: la del **cliente a SmartDeal** (qué pide y a qué precio se le vende) y la de **SmartDeal a un proveedor** (qué se compra para cumplirla). Ids asignados por Firestore; el número de OC es un campo. Nada se siembra: el cliente inicial y sus OC los carga el usuario desde la UI (el nombre real del cliente vive solo en Firestore). Repos: `clientsRepo.js`, `clientOrdersRepo.js`, `purchaseOrdersRepo.js`; lógica pura en `src/features/orders/ordersModel.js`.

**Las subcolecciones de líneas no se llaman `lines`**: `lines` ya es el grupo de colecciones de `quotations/{id}/lines`, y `quotesRepo` y varios scripts leen `collectionGroup('lines')` sin filtro — las líneas de un pedido aparecerían como cotizaciones.

**`clients/{id}`**: `name` (razón social), `rut`, `contact: { person, email, phone }`, `notes`, `created_at`, `updated_at`.

**`client_orders/{id}`**: `client_id`, `number` (N.º de OC del cliente), `date` (`'AAAA-MM-DD'`), `status` (`draft`|`received`|`confirmed`|`purchasing`|`delivered`|`cancelled` — Borrador, Recibida, Confirmada, En compra, Entregada, Anulada), `currency` (`CLP`|`USD`; normalmente CLP), `notes`, `created_at`, `updated_at`.

**`client_orders/{id}/client_order_lines/{id}`**: `part_id`, `qty` (entero), `unit_price` (Money en la moneda de la OC, o `null` si aún no se acuerda), `fulfillment` (`purchase` hoy; `stock` reservado para cuando exista inventario — no hay inventario todavía), `created_at`. Es lo mínimo que consume el simulador de compra: `[{ partId, qty }]`.

**`purchase_orders/{id}`**: `supplier_id`, `quotation_id` (opcional), `number`, `date`, `status` (`draft`|`sent`|`confirmed`|`shipped`|`received`|`cancelled` — Borrador, Enviada, Confirmada, Embarcada, Recibida, Anulada), `incoterm` (Incoterms 2020) e `incoterm_place`, `currency` (`USD`|`CNY`, la del proveedor), `notes`, `created_at`, `updated_at`.

**`purchase_orders/{id}/purchase_order_lines/{id}`**:

```json
{
  "part_id": "aB3xK9pQr2mZ7vLtYdN1",
  "qty": 10,
  "unit_price": { "amount": 4500, "currency": "USD", "scale": 2 },
  "quote_line_id": "Zp81…",
  "client_order_links": [{ "client_order_id": "Hq3…", "line_id": "Lm9…", "qty": 6 }],
  "created_at": "…"
}
```

`quote_line_id` = línea de cotización de la que salió el precio (tramo por volumen según la cantidad). `client_order_links` dice qué líneas de OC de clientes cubre esta compra; la UI no deja enlazar más de lo que falta cubrir de cada línea ni más de lo que se compra (`validateLinks`). Una OC anulada no cubre nada. Una línea de cliente enlazada no se puede borrar ni cambiar de repuesto.

**Margen por pedido** (`clientOrderCoverage`): venta de lo cubierto − precio de compra de lo cubierto, en la moneda de la OC del cliente, en basis points sobre la venta. El precio de compra es el del proveedor con su Incoterm (normalmente EXW), **no** el costo puesto en Chile → siempre en rojo. Si la compra está en otra moneda se convierte con el tipo de cambio de referencia (`DEFAULT_FX`), sin confirmar.

`createPurchaseOrder({ supplierId, quotationId, number, date, status, incoterm, incotermPlace, currency, notes, lines: [{ partId, qty, unitPrice, quoteLineId, clientOrderLinks: [{ clientOrderId, lineId, qty }] }] })` crea la OC y sus líneas en un solo lote; es el punto de entrada para que el simulador genere OC desde el reparto.

Sin índices compuestos: las pantallas leen las colecciones completas y `collectionGroup('client_order_lines')` / `collectionGroup('purchase_order_lines')` sin filtros. Las Security Rules actuales (bootstrap, `{path=**}`) ya cubren estas colecciones.

## Índices compuestos (`firestore.indexes.json`)

Los que exige el rollup y el catálogo transversal:
- `parts`: `vehicle_ids` (array-contains) + `quote_rollup.alternative.min_usd_micro` (asc).
- `parts`: `category_path` (asc) + `demand_scale` (desc) — para el catálogo ordenado por rotación × ahorro.
- `lines` (grupo de colecciones): `part_id` (asc) + `valid_until` (asc) — para detectar cotizaciones por vencer.

Se declaran conforme se necesiten en Fase 2, no especulativamente.
