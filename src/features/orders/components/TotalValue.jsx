'use client'

import MoneyValue from '@components/common/MoneyValue'
import UncertainValue from '@components/common/UncertainValue'

/** Total de una OC; en rojo si alguna línea no tiene precio (no suma). */
export default function TotalValue({ total, missingPrice }) {
  return (
    <UncertainValue
      verified={missingPrice === 0}
      reason={`${missingPrice} ${missingPrice === 1 ? 'línea' : 'líneas'} sin precio: no suman al total`}
    >
      <MoneyValue money={total} />
    </UncertainValue>
  )
}
