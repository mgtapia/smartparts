'use client'

import UncertainValue from '@components/common/UncertainValue'
import { MoneyFromMicros } from '@components/common/MoneyValue'
import { formatBp } from '@libs/percent'
import { FX_REASON, MARGIN_REASON } from '../constants'

/**
 * Margen estimado (monto y % sobre la venta). Siempre en rojo: el costo es el
 * precio del proveedor con su Incoterm, no el costo puesto en Chile.
 *
 * @param {Object} props
 * @param {{ marginMicros: number, marginBp: number|null, currency: string }|null} props.margin
 * @param {boolean} [props.converted]  Algún costo se convirtió de otra moneda.
 * @param {string} [props.missingText] Qué mostrar sin margen.
 */
export default function MarginValue({ margin, converted = false, missingText = 'Sin compra' }) {
  if (!margin) {
    return (
      <UncertainValue verified={false} reason="Sin compra enlazada con precio">
        {missingText}
      </UncertainValue>
    )
  }
  const reason = converted ? `${MARGIN_REASON} ${FX_REASON}` : MARGIN_REASON
  return (
    <UncertainValue verified={false} reason={reason}>
      <MoneyFromMicros micros={margin.marginMicros} currency={margin.currency} />
      {margin.marginBp === null ? null : ` · ${formatBp(margin.marginBp)}`}
    </UncertainValue>
  )
}
