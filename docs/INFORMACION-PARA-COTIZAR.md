# INFORMACIÓN PARA COTIZAR Y DECIDIR — Dongfeng E70

Qué necesitamos saber para decidir a quién comprarle y a qué costo, qué **ya tenemos**, y qué **NO tenemos** (con cómo conseguirlo). Vocabulario universal: ver [[GLOSARIO-IMPORTACION]] (Incoterms 2020, HS code, MOQ, PI, etc.) — ningún término interno que otro importador no entendería.

Estado al 2026-09-24. Se actualiza cada vez que llega información nueva.

## Etapa y objetivo

1. **Etapa actual — sourcing (compra para nosotros):** cotizar el Dongfeng E70 con proveedores chinos, comparar en igualdad de condiciones y elegir. Alcance: solo Dongfeng E70, el vehículo más importante para el cliente inicial.
2. **Hito de cierre:** una primera **PO** (orden de compra) y su factura **aceptadas por el cliente inicial**.
3. **Después del hito:** viaje a China para negociar mejores precios directo. No se viaja antes.
4. **Etapa siguiente — venta:** lista de precios al cliente, margen, tipo de cambio de venta, IVA crédito/débito, comparación aéreo vs marítimo por urgencia y plan mixto. Fuera del alcance de este documento.

## Cómo se compara: base común

Dos precios solo son comparables con el **mismo Incoterm y lugar**. Regla: todo se lleva a una base **FCA/FOB puerto de origen** (o directamente a _landed cost_ cuando haya tarifas). Un precio **EXW** se convierte sumando: transporte interno hasta el puerto, despacho de exportación y manejo en origen (THC). Hasta tener esas tarifas reales, un EXW **no se compara** con un FOB — se muestra con aviso, no como igual.

## Qué tenemos y qué no

Leyenda: ✅ tenemos · 🟡 parcial / sin respaldo · ❌ no tenemos.

### A. Identidad del repuesto

| Dato | Estado | Detalle / cómo conseguirlo |
| --- | --- | --- |
| Nombre ES / EN / ZH | 🟡 | Traducciones directas del nombre en español, no terminología oficial del fabricante. Validar con el proveedor |
| Código local (Chile) | ✅ | El que reconoce el comprador local |
| Código de sourcing / OEM (China) | 🟡 | Solo los verificados contra fuente citable. Una parte quedó provisional y algunas sin código — ver [[MEMORY]]. Nunca se aceptan códigos sin fuente |
| VIN, año-modelo y variante | ❌ | Los proveedores lo piden para cotizar piezas exactas (división comercial vs pasajeros). Pedirlo al cliente inicial (VIN por unidad de la flota) |
| Fotos / plano de la pieza | ❌ | Pedir al cliente inicial fotos de la pieza instalada; sirve para confirmar el match |

### B. Cotización (por línea)

| Dato | Estado | Detalle / cómo conseguirlo |
| --- | --- | --- |
| Precio unitario | ✅ | 4 proveedores, 418 cotizaciones cargadas (uno de ellos en CNY, sin confirmar). Con tramos por volumen se compara el precio unitario más alto |
| Moneda | 🟡 | USD, confirmado por el equipo; falta respaldo escrito del proveedor |
| Incoterm | 🟡 | EXW según el equipo; falta confirmación escrita |
| **Lugar nombrado del Incoterm** (ej. "EXW Zhengzhou") | ❌ | Obligatorio para que el término esté completo. Pedir dirección exacta de retiro |
| Calidad (OEM / AFM) | 🟡 | Mapeada desde las columnas; el "OEM" del proveedor no está verificado — regla dura: nunca auto-confirmar `original` |
| MOQ | ❌ | Pedir por línea |
| Vigencia de la oferta | ❌ | Pedir en la PI |
| **Lead time de producción** | ❌ | Pedir por línea (stock vs bajo pedido) |
| Condiciones de pago | ❌ | Anticipo, saldo, medio de pago |
| Garantía y política de devolución | ❌ | Pedir; clave en piezas mecánicas |
| Proforma Invoice (PI) formal | ❌ | Las hojas recibidas son listas de precios, no PI. Pedirla antes de pagar |

### C. Logística por producto

| Dato | Estado | Detalle / cómo conseguirlo |
| --- | --- | --- |
| Peso bruto y dimensiones del bulto | ❌ | Hoy hay valores genéricos repetidos (solo ~50 combinaciones en ~590 repuestos), marcados `estimated`/`suspect` en `logistics_status`: no sirven para fletes reales. Pedir en el RFQ (packing list por línea) |
| Unidades por bulto / embalaje | ❌ | Pedir |
| Peso volumétrico | ❌ | Se calcula al tener dimensiones reales |
| Mercancía peligrosa (batería, litio) | 🟡 | Reglas en el motor; falta clasificar cada pieza del E70 |

### D. Proveedor

| Dato | Estado | Detalle / cómo conseguirlo |
| --- | --- | --- |
| Razón social y contacto | 🟡 | 4 proveedores con nombre. Contacto de Henan Ronglai y Anhui Zuoheng; XM Industrial sin contacto en la proforma; el revendedor de Alibaba sin nombre (solo su tienda) |
| Tipo de proveedor (fábrica / distribuidor / revendedor / intermediario) | 🟡 | Declarado, sin verificar: XM = fábrica, Anhui = distribuidor, Alibaba = revendedor; Henan sin declarar. Pedir licencia comercial (营业执照) |
| Ubicación y puerto de embarque habitual | ❌ | Necesario para el tramo interno |
| ¿Emite Form F (certificado de origen TLC Chile-China)? | ❌ | Preguntar explícito. Sin Form F no se asume ahorro de arancel |
| Origen de fabricación de la pieza | ❌ | Un intermediario puede vender piezas no chinas (no califican al TLC) |
| Verificación (licencia, cuenta bancaria a nombre de la empresa) | ❌ | Antes del primer pago |

### E. Costos que nos faltan para llevar a landed cost

| Dato | Estado | Detalle / cómo conseguirlo |
| --- | --- | --- |
| **HS code** por repuesto | ❌ | No está en el modelo de datos. Definir con el agente de aduanas; determina arancel |
| Arancel general y preferencial | 🟡 | Vive en `cost_param_sets`; verificar vigencia con el agente |
| Tramo interno China → puerto | ❌ | Cotizar con forwarder o agente en origen |
| Flete internacional aéreo / marítimo (tarifas y tránsito) | ❌ | Cotizar con forwarder; hoy hay parámetros de ejemplo |
| Seguro | ❌ | Cotizar |
| Gastos locales (agente de aduanas, almacenaje) | 🟡 | Parámetros del motor; validar con el agente contra un caso real |

### F. Del lado del cliente inicial

| Dato | Estado | Detalle / cómo conseguirlo |
| --- | --- | --- |
| Precio de referencia actual (Chile, neto) | ✅ | Es una referencia, no comparable con FOB/CIF |
| Consumo real por pieza | 🟡 | Hoy es estimación de rotación; pedir historial de taller |
| Cantidades a comprar en la primera PO | ❌ | Define MOQ, consolidación y modo de transporte |
| Qué formato y moneda exige la factura/PO | ❌ | Confirmar antes de emitir |

## Próximas acciones (para cerrar los ❌ de sourcing)

1. **RFQ al proveedor** (en inglés y chino) pidiendo, por línea: Incoterm + lugar, MOQ, lead time, peso bruto, dimensiones y unidades por bulto; y, a nivel proveedor: tipo (fábrica/trader), ubicación, puerto, Form F, condiciones de pago, garantía, vigencia. Ver el template de cotización (pendiente).
2. **Forwarder / agente en China:** tarifas de tramo interno, exportación y flete aéreo/marítimo (tránsito incluido).
3. **Agente de aduanas Chile:** HS code por repuesto, requisitos del Form F para repuestos, y un caso real de liquidación para validar el motor.
4. **Cliente inicial:** VIN/variante, fotos, cantidades de la primera PO y requisitos de PO/factura.
