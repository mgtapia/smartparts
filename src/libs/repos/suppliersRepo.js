// Repository ligero — Fase 1 lee de src/mocks/ (ver .agent/ARCHITECTURE.md §4).
import { SUPPLIERS, getSupplier } from '@mocks/suppliers'

export function listSuppliers() {
  return SUPPLIERS
}

export { getSupplier }
