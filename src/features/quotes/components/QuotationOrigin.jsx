import UncertainValue from '@components/common/UncertainValue'
import { factOf } from '@features/suppliers/constants'

/**
 * Origen de una cotización: el lugar del Incoterm si la cotización lo nombra; si no, la
 * ubicación del proveedor, que es de donde sale la mercadería. Va en rojo mientras ese
 * dato no esté confirmado con una fuente.
 */
export default function QuotationOrigin({ quotation }) {
  if (quotation.incotermPlaces.length > 0) {
    return (
      <UncertainValue
        verified={quotation.incotermPlaceConfirmed}
        reason="Lugar del Incoterm sin confirmar"
      >
        {quotation.incotermPlaces.join(', ')}
      </UncertainValue>
    )
  }
  const location = factOf(quotation.supplier, 'location')
  if (location.value) {
    return (
      <UncertainValue verified={location.confirmed} reason="Ubicación del proveedor sin confirmar">
        {location.value}
      </UncertainValue>
    )
  }
  return (
    <UncertainValue verified={false} reason="Sin lugar en la cotización ni ubicación del proveedor">
      Sin lugar
    </UncertainValue>
  )
}
