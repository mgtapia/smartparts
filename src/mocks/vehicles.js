// Flota real del cliente inicial — ver .agent/MEMORY.md §Fuente de datos real.
// demandScale: umbrales de "Cantidad estimada" por nivel, definidos por el cliente
// en su propia planilla (no inventados) — ver docs/MODELO-DE-DATOS.md.

export const VEHICLES = [
  {
    id: 'dongfeng_e70',
    brand: 'Dongfeng',
    model: 'E70 EV 47,5 kWh AUT',
    origin: 'China',
    year: 2024,
    fleetSize: 470,
    demandScale: { casi_nunca: 5, rara_vez: 10, a_veces: 20, casi_siempre: 50 },
    sourcingNote: 'Marca china — sourcing directo a la cadena del fabricante.',
  },
  {
    id: 'kia_niro_ev',
    brand: 'Kia',
    model: 'Niro EV 64.8 kWh AUT',
    origin: 'Corea',
    year: 2023,
    fleetSize: 150,
    demandScale: { casi_nunca: 2, rara_vez: 4, a_veces: 8, casi_siempre: 20 },
    sourcingNote: 'OEM coreano — en China se consigue aftermarket y OEM-supplier.',
  },
  {
    id: 'neta_aya',
    brand: 'Neta',
    model: 'Aya',
    origin: 'China',
    year: 2024,
    fleetSize: 150,
    demandScale: { casi_nunca: 3, rara_vez: 6, a_veces: 12, casi_siempre: 30 },
    sourcingNote: 'Marca china — sourcing directo a la cadena del fabricante.',
  },
  {
    id: 'dongfeng_nammi',
    brand: 'Dongfeng',
    model: 'Nammi',
    origin: 'China',
    year: 2024,
    fleetSize: 70,
    demandScale: { casi_nunca: 2, rara_vez: 2, a_veces: 4, casi_siempre: 10 },
    sourcingNote: 'Marca china — sourcing directo a la cadena del fabricante.',
  },
]

export function getVehicle(id) {
  return VEHICLES.find((v) => v.id === id) || null
}
