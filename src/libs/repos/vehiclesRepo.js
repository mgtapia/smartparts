// Repository ligero — Fase 1 lee de src/mocks/, Fase 2 reemplaza el cuerpo por
// Firestore sin cambiar la firma (ver .agent/ARCHITECTURE.md §4).
import { VEHICLES, getVehicle } from '@mocks/vehicles'

export function listVehicles() {
  return VEHICLES
}

export { getVehicle }
