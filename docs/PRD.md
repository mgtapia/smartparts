# PRD — SmartParts

## Visión

Una plataforma donde el catálogo, las cotizaciones de proveedores chinos, el motor de costeo y las estadísticas viven en un solo lugar, de modo que *"¿cuánto me cuesta realmente este repuesto puesto en Santiago, cuánto ahorra el cliente contra lo que paga hoy, y a qué precio se lo vendo?"* se responda en un click.

## El problema

Buscar en China originales y alternativos, juntar cotizaciones de varios proveedores y decidir qué comprar, a quién y por qué vía es hoy un ejercicio manual en planillas sueltas. El costo real puesto en Chile no es el precio FOB: flete, seguro, arancel, IVA, agente de aduanas y gastos locales reordenan por completo el ranking de proveedores (ver [[MOTOR-DE-COSTOS]]).

## El factor distintivo: ride-hailing

La flota cliente es de ride-hailing: kilometraje altísimo y, sobre todo, **un vehículo detenido esperando un repuesto deja de generar ingreso todos los días**. El lead time no es una molestia logística, es plata medible. Esto define dos cosas del producto:

- El catálogo se ordena por **rotación de flota × ahorro**, no alfabéticamente.
- El motor de costos incorpora **costo de inmovilización por día** como variable de primera clase en el comparador barco vs. avión.

## Usuarios y roles

| Rol | Puede | Ejemplo |
|---|---|---|
| **Admin** | Todo, incluye parámetros aduaneros y roles | Dueño/gerencia |
| **Comprador** | Catálogo, cotizaciones, sourcing, costeo, embarques. **No** ve margen ni precio de venta salvo que se le dé permiso explícito | Equipo de compras |
| **Consulta** | Solo lectura de catálogo, dashboard, estado de embarques | Stakeholder que necesita visibilidad sin poder editar |

Detalle de permisos en [[SEGURIDAD-Y-ROLES]].

## Módulos (MVP)

| Módulo | Qué hace |
|---|---|
| `dashboard` | Ahorro acumulado vs. baseline, gasto por vehículo, distribución original/OEM/alternativo, embarques en tránsito, cotizaciones por vencer. |
| `vehicles` | Los 4 EVs del cliente inicial. Ficha por vehículo: despiece, qué tiene cotización y qué no, costo total de mantener ese modelo. |
| `catalog` | Catálogo general con taxonomía jerárquica (`Carrocería` · `Mecánica` · `Electricidad`, heredada de la planilla real del cliente inicial). Vista transversal: un repuesto puede aplicar a varios modelos. |
| `parts` | **La ficha de repuesto — el corazón de la app.** Código OEM, equivalencias/códigos cruzados, nombre ES/EN/ZH, categoría, specs, peso y dimensiones, fotos, vehículos compatibles, precio baseline, todas las cotizaciones, histórico de precios, mejor landed cost vigente. |
| `suppliers` | Proveedores chinos: ficha, plataforma de origen, MOQ típico, incoterm habitual, verificación, scorecard e historial. |
| `quotes` | Bandeja de entrada, carga manual, comparador lado a lado por repuesto, control de vigencia. |
| `sourcing` | Búsqueda en fuentes chinas vía la capa de conectores: lanzar búsqueda por código OEM, revisar candidatos, aprobar y convertir en cotización. |
| `costing` | Calculadora de landed cost. Escenarios guardados, comparación barco vs. avión lado a lado, desglose completo. |
| `shipments` | Embarques: armado de carga, prorrateo real, estados y fechas, costo real vs. estimado. |
| `clients` | **(nuevo por el modelo de reventa)** Flotas cliente. El cliente inicial es el primero: parque de vehículos, lista de precios, historial de consumo. |
| `pricing` | **(nuevo)** Margen y precio de venta. Landed cost + margen objetivo por categoría → lista de precios por cliente. Visible solo para roles autorizados. |
| `imports` | **(nuevo)** Importador de planillas: mapeo de columnas, previsualización, reporte de anomalías, confirmación. |
| `settings` | Parámetros aduaneros versionados, tipos de cambio, usuarios y roles. |

## Features priorizadas más allá del MVP

Ordenadas por relación valor/esfuerzo. Las ⭐⭐⭐ son núcleo, no extras.

- **⭐⭐⭐ Ranking de oportunidades de ahorro** — `(precio baseline − landed cost) × consumo anual`. Responde "por dónde empiezo" el primer día.
- **⭐⭐⭐ Punto de equilibrio barco vs. avión con costo de inmovilización** — la variable que hace real la comparación en este negocio.
- **⭐⭐⭐ Margen y lista de precios por cliente** — sin esto la plataforma calcula costos pero no cierra el negocio.
- **⭐⭐⭐ Simulador de consolidación** — sugiere qué sumar a un embarque para cruzar un umbral (CBM, mínimo de flete, DIN simplificada).
- **⭐⭐⭐ Gestión documental por embarque** — checklist con Storage: factura, packing list, **Form F**, y para baterías MSDS + UN38.3.
- **⭐⭐ Histórico de precios por repuesto** — serie temporal (`@mui/x-charts`).
- **⭐⭐ Alertas** — cotización vencida, sin cotización vigente, variación de FX sobre umbral, precio de fuente que sube.
- **⭐⭐ Scorecard de proveedor** — puntualidad, no conformidades, tiempo de respuesta, resultado de muestras.
- **⭐⭐ Modo "qué pasa si"** — sensibilidad ante cambios de FX/flete/arancel sobre todo el catálogo.
- **⭐⭐ Exportar a PDF/Excel** — cotización presentable, con o sin margen según rol.
- **⭐⭐ Stock y punto de reorden por rotación de flota** — se conecta con el simulador de consolidación.
- **⭐ Control de recepción y no conformidades** — alimenta el scorecard.
- **⭐ Registro de comunicación con proveedor** — hilos y adjuntos asociados a proveedor/cotización.

## Alcance del MVP (Fase 1, ver [[ROADMAP]])

Shell + rail de navegación, y las pantallas estrella contra mock data con el contrato de props definitivo: catálogo, ficha de repuesto, comparador de cotizaciones, calculadora de costos con desglose, dashboard. Resto de rutas como placeholder. Los mocks salen de filas reales de la planilla del cliente inicial, no inventados.

## Métricas de éxito

- **Ahorro medible**: Σ `(baseline − landed cost) × cantidad` sobre el catálogo cargado.
- **Cobertura del catálogo**: % de repuestos con al menos una cotización vigente vs. total del catálogo.
- **Tiempo de respuesta a "¿qué compro esta semana?"**: de horas en planillas sueltas a minutos en el dashboard.
- **Anomalías detectadas y resueltas**: cola de "sin código"/duplicados que baja con el tiempo, no que se acumula.
