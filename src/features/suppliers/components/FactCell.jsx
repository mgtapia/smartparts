import UncertainValue from '@components/common/UncertainValue'
import { factOf, factText } from '../constants'

/** Un dato con fuente del proveedor en una celda de lista: en rojo si no está confirmado. */
export default function FactCell({ supplier, factKey }) {
  const fact = factOf(supplier, factKey)
  return (
    <UncertainValue verified={fact.confirmed} reason={fact.note ?? 'Sin confirmar con una fuente'}>
      {factText(factKey, fact.value) ?? 'Sin dato'}
    </UncertainValue>
  )
}
