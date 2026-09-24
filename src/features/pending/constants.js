// Alcance del dashboard: en la etapa de sourcing solo se trabaja el Dongfeng E70.
export const SOURCING_VEHICLE_ID = 'dongfeng_e70'

export const PENDING_TABS = {
  PENDING: 'pendientes',
  MILESTONE: 'hito',
}

export const TAB_LIST = [
  { value: PENDING_TABS.PENDING, label: 'Pendientes' },
  { value: PENDING_TABS.MILESTONE, label: 'Hito' },
]

/** Pasos del hito que se marcan a mano, con su fuente: no hay dato del cual calcularlos. */
export const MANUAL_STEPS = {
  chosenSupplier: { key: 'chosen_supplier', label: 'Proveedor elegido', field: 'Proveedor' },
  poIssued: { key: 'po_issued', label: 'OC emitida', field: 'Número de OC' },
  invoiceAccepted: {
    key: 'invoice_accepted',
    label: 'Factura aceptada por el cliente',
    field: 'Número de factura',
  },
}

/** Días hacia adelante en que una cotización se considera por vencer. */
export const EXPIRING_DAYS = 7
/** Mínimo de proveedores para poder comparar. */
export const MIN_SUPPLIERS_TO_COMPARE = 2
