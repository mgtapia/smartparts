# MOTOR DE COSTOS — SmartParts

Vive en `src/core/costing/`. **Función pura**: sin React, sin Firebase, sin red. Entra un `CostingInput`, sale un `CostingResult` con desglose por línea y total (contrato completo en `types.js`).

## La cadena de cálculo

```
FOB → + flete → + seguro → CIF → + arancel ad valorem → base IVA → + IVA → + gastos locales → landed cost
```

Con dos salidas que la UI no debe confundir:

- **`landedNet`** = CIF + arancel + gastos locales. **No incluye IVA** — si SmartDeal tiene crédito fiscal, el IVA no es un costo real, es un anticipo recuperable.
- **`cashOutlay`** = `landedNet` + IVA. La plata que efectivamente sale de la cuenta al momento del despacho, se recupere después o no.

Cuál es "el número principal" del comparador depende de si SmartDeal tiene derecho a crédito fiscal de IVA — **decisión de negocio abierta, ver [[MEMORY]] §Datos pendientes**. Hasta confirmarla, la UI muestra ambos números, sin elegir uno por defecto.

Todos los montos que produce el motor están en **USD** — es la moneda en la que Aduana Chile liquida un DIN. La conversión a CLP para mostrar en la UI es un paso de presentación aparte (`src/libs/fx.js`), no participa de las invariantes de suma internas del motor.

## El flete no se inventa, se prorratea

El motor **no tiene una tabla de tarifas de flete**. `CostingInput.freightQuote` es el total cotizado por el forwarder para todo el embarque; el motor lo reparte entre líneas por **unidades facturables** (`allocation: 'by_chargeable_units'`). Esto refleja cómo se cotiza en la realidad: uno recibe un flete total por embarque, no un precio por kg que el sistema calcula solo.

## Prorrateo: regla mixta, no todo por valor

Cada concepto se reparte por la base que lo genera:

| Concepto | Base de prorrateo |
|---|---|
| Flete | Unidades facturables (peso/volumen) |
| Seguro | Valor FOB + flete (es lo que se asegura) |
| Impuestos (arancel, IVA) | Su propia base imponible, por línea |
| Agente de aduanas | Valor CIF total |
| Almacenaje y handling | Volumen |
| Recargos de mercancía peligrosa | Directo a la línea que los causa |

Prorratear todo por valor haría que piezas chicas y caras (un pedal) subsidien el flete de piezas grandes y livianas (un parachoques) — y eso invierte las conclusiones de compra. Con un catálogo dominado por carrocería (ver [[PRD]]), la diferencia es enorme.

## Peso volumétrico: la variable dominante en este catálogo

Siendo un catálogo de piezas de carrocería (parachoques, puertas, tapabarros), casi ninguna línea paga por peso real. El motor elige el **mayor entre real y volumétrico** por línea y expone cuál aplicó (`chargeableBasis: 'real'|'volumetric'`, ver `weights.js`):

- **Aéreo**: divisor 6000 o 5000 — es negociación con el forwarder, cambia el flete ~20%. Va como parámetro visible (`params.freightDefaults.airVolumetricDivisor`), nunca escondido.
- **Marítimo LCL**: cobra por W/M (1 CBM ≈ 1000 kg, `params.freightDefaults.seaLclWmKgPerCbm`).

## Redondeo: por qué los números cuadran siempre

Los impuestos se calculan **al nivel en que los liquida Aduana** (sobre el CIF ya prorrateado por línea) y después se prorratean los gastos locales — calcular línea por línea y sumar arancel/IVA de forma independiente daría un total distinto al de la DIN real si no se tiene cuidado.

Todos los prorrateos usan **método del resto mayor** (`allocateByWeights()` en `src/libs/money.js`) con desempate determinista por índice, de modo que `Σ líneas === total` siempre, exacto — nunca una "diferencia de redondeo" visible en la UI. Los totales del motor, además, **se definen como la suma de las líneas**, nunca se calculan por una fórmula aparte — así la invariante es estructural, no una coincidencia (ver `engine.js`).

El unitario (`unitLandedNetMicro`) se guarda con precisión de 4 decimales de USD (100 micros = 1 centésima de centavo): redondearlo antes a centavos y multiplicarlo por la cantidad es el error clásico que descuadra todo.

## Baterías y alto voltaje: bloqueo, no advertencia

Aunque el catálogo actual es de carrocería, ya aparecen componentes HV (terminales del puerto de carga, caja reductora, compresor) y eventualmente la batería. Las de litio son **mercancía peligrosa Clase 9 (UN3480/3481)**: exigen UN38.3, MSDS y embalaje certificado; están **prohibidas en aviones de pasajeros**; muchos consolidadores LCL las rechazan.

El motor lo trata como bloqueo (`dgBlocker.js`), no como advertencia: si el modo es aéreo y la línea no puede volar, la línea queda `blocked: true` con sus campos monetarios en cero y una razón en `blockReasons` — **no produce un número**. Producir un costo aéreo para algo que no puede volar es peor que no producirlo. Falta de UN38.3 sí es solo `warning` (bloquea el despacho real, no el cálculo del costo).

El catálogo necesita el flag `parts.sourcing_strategy: 'local_only'` para packs de tracción completos, donde la respuesta honesta es que importar directo no es viable a esta escala.

## Regla dura: nada de tasas hardcodeadas

El arancel ad valorem, el IVA, los umbrales y las tarifas del agente de aduanas **cambian por ley**. Viven en `cost_param_sets`, **inmutable**: corregir una tasa es crear una versión nueva, nunca editar la vigente. Cada costeo guardado referencia su `paramSetId`.

> ⚠️ **Ninguna cifra fiscal del seed debe considerarse verificada.** Van marcadas `verification_status.verified_against_official: false`, con un banner en la UI hasta confirmarlas. Dos puntos críticos a validar con el agente de aduanas:
> - **El 0% del TLC Chile-China no es automático**: depende de la partida (HS code) y de presentar un Form F válido. Se modela **por línea** (`duty.rateOverridesByHs`), no por embarque. Sin Form F se paga el arancel general (`duties.js`).
> - **Ley 21.713** (cambio normativo de IVA en compras internacionales de bajo valor): afecta sobre todo muestras vía AliExpress, que pueden llegar con IVA ya pagado en origen.

## Reproducibilidad como test

`CostingResult = f(engineVersion, paramSetId, fxSnapshot, input, allocationPolicy)`. `src/core/costing/engine.test.js` fija un **golden test**: un caso de una línea con números redondos, verificado a mano, con el resultado esperado completo pineado. Cualquier cambio que altere ese resultado exige bump de `ENGINE_VERSION` y justificación explícita en el commit — nunca "ajustar el test para que pase" (ver [[WORKFLOW]]).

Las invariantes de suma (`Σ líneas === total` para cada campo monetario, `landedNet = cif + duty + localCosts`, `cashOutlay = landedNet + vat`) están cubiertas además con **property-based tests** (`fast-check`, 200 corridas aleatorias) — es la forma más barata de garantizar que nadie las rompa después sin darse cuenta.

## Estado actual de la implementación

`ENGINE_VERSION = '1.0.0'`. Implementado y con 28/28 tests verdes: `money.js`, `types.js`, `weights.js`, `allocation.js`, `localCosts.js`, `duties.js`, `vat.js`, `dgBlocker.js`, `engine.js`.

Pendiente para Fase 2+ (no bloquea el scaffolding):
- Modelo de lead time real (`logistics.leadTimeTotalDays` hoy es un placeholder que devuelve `options.warehousingDays`).
- Tabla de tarifas de referencia por fuente/ruta, si se decide ofrecer una estimación de flete *antes* de tener una cotización real (hoy el motor exige `freightQuote` explícito, deliberadamente — ver §El flete no se inventa).
- Verificación oficial de las tasas del seed contra Aduana de Chile / SII.
