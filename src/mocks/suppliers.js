// Proveedores — SINTÉTICOS (no hay proveedores contactados todavía, ver
// .agent/MEMORY.md §Datos pendientes). Sirven para dar contexto a las cotizaciones
// mock y probar el comparador. Se reemplazan por proveedores reales en Fase 3.
//
// China es la fuente PRIORITARIA (las 3 de 4 marcas de la flota son chinas, ver
// docs/INTEGRACIONES-CHINA.md), pero no la única válida: `country` es un campo
// libre, no un enum cerrado a China — un proveedor de otro país que compita en
// precio/plazo es tan válido como uno chino. `platform: 'other'` cubre sourcing
// fuera de las 4 plataformas chinas priorizadas (ver src/constants/enums.js).

export const SUPPLIERS = [
  {
    id: 'sup_taizhou_autoparts',
    name: 'Taizhou Auto Parts Co.',
    country: 'CN',
    platform: '1688',
    moq: 20,
    incoterm: 'FOB',
    verified: true,
    scorecard: { onTimeRate: 0.91, defectRate: 0.02, avgResponseHours: 6 },
  },
  {
    id: 'sup_ningbo_ev_supply',
    name: 'Ningbo EV Supply Chain',
    country: 'CN',
    platform: 'alibaba',
    moq: 10,
    incoterm: 'FOB',
    verified: true,
    scorecard: { onTimeRate: 0.85, defectRate: 0.04, avgResponseHours: 14 },
  },
  {
    id: 'sup_guangzhou_aftermarket',
    name: 'Guangzhou Aftermarket Direct',
    country: 'CN',
    platform: 'aliexpress',
    moq: 1,
    incoterm: 'EXW',
    verified: false,
    scorecard: null,
  },
  {
    id: 'sup_seoul_oem_parts',
    name: 'Seoul OEM Parts Trading',
    country: 'KR',
    platform: 'other',
    moq: 5,
    incoterm: 'FOB',
    verified: true,
    scorecard: { onTimeRate: 0.94, defectRate: 0.01, avgResponseHours: 10 },
  },
]

export function getSupplier(id) {
  return SUPPLIERS.find((s) => s.id === id) || null
}
