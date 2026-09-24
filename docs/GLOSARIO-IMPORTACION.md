# GLOSARIO DE IMPORTACIÓN — SmartParts

Para que el equipo y los agentes hablen el mismo idioma. Términos usados en el código y en el resto de `docs/`.

## Incoterms y precio

Los Incoterms (ICC, versión **2020**) fijan hasta dónde llega el vendedor: costos, riesgo y trámites. Siempre se escriben **con un lugar nombrado** ("EXW Zhengzhou", "FOB Shanghai") — sin lugar, el término está incompleto. Un precio sin Incoterm y lugar no es comparable con otro.

| Incoterm | Nombre | Qué incluye el precio del vendedor | Modo de transporte |
| --- | --- | --- | --- |
| **EXW** | Ex Works | Solo la mercancía, lista en la fábrica/bodega del vendedor. Carga, transporte interno, exportación y todo lo demás: comprador | Cualquiera |
| **FCA** | Free Carrier | Entrega en un lugar acordado, con la exportación ya despachada por el vendedor | Cualquiera (el correcto para aéreo y contenedor) |
| **FOB** | Free On Board | Mercancía a bordo del buque en el puerto de origen, con la exportación despachada | **Solo marítimo/fluvial** |
| **CFR** | Cost and Freight | FOB + flete hasta el puerto de destino (sin seguro) | Solo marítimo |
| **CIF** | Cost, Insurance and Freight | CFR + seguro. Es la base sobre la que Aduana Chile calcula el arancel | Solo marítimo |
| **CIP** | Carriage and Insurance Paid | Equivalente a CIF para cualquier modo (con seguro) | Cualquiera |
| **DAP** | Delivered at Place | Entregado en destino, sin despachar importación | Cualquiera |
| **DDP** | Delivered Duty Paid | Entregado con importación y aranceles pagados por el vendedor | Cualquiera |

Ojo: proveedores chinos dicen "FOB" también para carga aérea, aunque técnicamente sería FCA. Lo que importa es lo que el proveedor incluye en el precio — preguntarlo por escrito.

- **Landed cost**: el costo total puesto en destino, incluyendo todo lo demás además de CIF (arancel, IVA, gastos locales). Es "cuánto me costó realmente" — ver [[MOTOR-DE-COSTOS]].

## Términos de compra y documentos comerciales

- **MOQ** (Minimum Order Quantity): cantidad mínima que el proveedor acepta vender.
- **Lead time**: días desde la orden/pago hasta que la mercancía está lista (producción) — distinto del tránsito.
- **RFQ** (Request for Quotation): solicitud de cotización enviada al proveedor.
- **PI** (Proforma Invoice): cotización formal del proveedor con precio, Incoterm, plazo y condiciones de pago; es la base para pagar.
- **PO** (Purchase Order): orden de compra del comprador.
- **Commercial Invoice**: factura comercial de la exportación; base del valor en Aduana.
- **Packing List**: detalle de bultos con peso y dimensiones.
- **HS code** (Harmonized System): código arancelario internacional de 6 dígitos (Chile lo extiende a 8); define arancel y requisitos por producto.
- **Gross / Net weight**: peso bruto (con embalaje) / neto (solo el producto). **Volumetric (chargeable) weight**: peso por volumen que cobran aéreo y courier cuando supera al real.
- **CBM** (cubic metre): metro cúbico, unidad de cobro del marítimo LCL.
- **LCL / FCL**: carga consolidada / contenedor completo.
- **THC** (Terminal Handling Charge): cargo por manejo en terminal del puerto.
- **AWB / B/L**: guía aérea / conocimiento de embarque marítimo.
- **OEM / AFM**: pieza de calidad original del fabricante del vehículo / repuesto de un tercero sin vínculo con la marca (*aftermarket*).

## Tipos de proveedor

- **Fábrica**: fabrica la pieza. Puede emitir el Formulario F (certificado de origen) con más facilidad.
- **Distribuidor**: compra a fábrica o a otros y revende con acuerdo de distribución; no fabrica.
- **Revendedor**: compra y revende sin ser distribuidor autorizado (ej. tienda en Alibaba).
- **Intermediario** (_trader_): no tiene stock propio, consigue la pieza con terceros y cobra comisión.

Todo tipo es lo que el proveedor declara hasta que se verifique (licencia comercial, origen de las piezas).

## Aduana y documentos

- **DIN** (Declaración de Ingreso): el documento con el que se formaliza la importación ante Aduana Chile.
- **DIN simplificada**: trámite reducido para envíos bajo cierto valor FOB (umbral en `cost_param_sets.thresholds.dinRequiredFobUsd`).
- **Form F** (Certificado de Origen): documento que acredita que la mercancía es originaria de China, requisito para aplicar la preferencia arancelaria del TLC Chile-China. Sin él, se paga el arancel general aunque el producto sea chino.
- **Ad valorem**: arancel calculado como porcentaje del valor (CIF), no un monto fijo.
- **Agente de aduanas**: intermediario habilitado que tramita el despacho ante Aduana; su tarifa es uno de los conceptos de `LocalCostConcept`.
- **TLC Chile-China**: tratado de libre comercio que puede llevar el arancel a 0% — condicionado a partida arancelaria + Form F válido (ver [[MOTOR-DE-COSTOS]]).

## Mercancía y clasificación

- **HS code** (partida arancelaria / Sistema Armonizado): código internacional que clasifica el tipo de mercancía; determina la tasa de arancel aplicable.
- **MOQ** (Minimum Order Quantity): cantidad mínima que un proveedor chino acepta vender por pedido.
- **OEM** (Original Equipment Manufacturer): fabricante original. Una pieza "original" viene de la cadena del fabricante del vehículo; una "alternativa"/aftermarket es de un tercero compatible.

## Logística

- **LCL** (Less than Container Load): carga marítima consolidada, se paga por espacio (W/M) dentro de un contenedor compartido con otros embarques.
- **FCL** (Full Container Load): un contenedor completo dedicado (20' o 40' HQ).
- **W/M** (Weight/Measurement): la unidad de cobro del flete marítimo LCL — el mayor entre peso real y volumen convertido a toneladas (1 CBM ≈ 1000 kg).
- **CBM** (Cubic Meter): metro cúbico, unidad de volumen de carga.
- **Peso volumétrico**: peso "ficticio" calculado desde el volumen (÷ divisor negociado, típicamente 5000 o 6000 para aéreo); se cobra el mayor entre peso real y volumétrico.
- **Revenue Ton (R/T)**: la unidad facturable final de una línea de carga marítima, tras aplicar la regla del mayor entre peso y volumen.

## Mercancía peligrosa

- **DG** (Dangerous Goods): mercancía peligrosa. Las baterías de litio son Clase 9.
- **UN3480 / UN3481**: números ONU que identifican baterías de litio (sueltas / instaladas en equipo) como mercancía peligrosa.
- **UN38.3**: protocolo de pruebas que certifica que una batería de litio es segura para transporte — documento requerido, no opcional.
- **MSDS** (Material Safety Data Sheet): ficha de datos de seguridad del material/componente.
- **Cargo Aircraft Only**: restricción de transporte aéreo que permite la mercancía solo en avión de carga, nunca en avión de pasajeros.

## Dominio de este proyecto

- **Landed cost neto vs. cash outlay**: ver [[MOTOR-DE-COSTOS]] — la distinción entre "costo real si el IVA es recuperable" y "la plata que sale de la cuenta hoy".
- **Quote rollup**: el mínimo vigente de cotización por repuesto, precalculado para que el catálogo se pueda ordenar/filtrar sin joins (ver [[MODELO-DE-DATOS]]).
- **Baseline**: el precio que el cliente paga hoy por un repuesto — la vara contra la que se mide el ahorro.
- **Demand basis**: si la cantidad esperada de consumo de un repuesto es `estimated` (rotación de flota estimada) o `historical` (consumo real registrado).
