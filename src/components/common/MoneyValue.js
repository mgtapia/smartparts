import Box from '@mui/material/Box'
import { fromMicros } from '@libs/money'

const FORMATTERS = {
  CLP: new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }),
  USD: new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }),
  CNY: new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 2,
  }),
}

/**
 * Formatea un Money ({amount, currency, scale}) — nunca `toFixed()` inline en
 * un componente (ver CLAUDE.md §El dinero). Acepta también un Money "negativo
 * visual" para deltas (ahorro) vía `signed`.
 */
export default function MoneyValue({ money, signed = false, sx, ...rest }) {
  if (!money) return null
  const formatter = FORMATTERS[money.currency] || FORMATTERS.CLP
  const formatted = formatter.format(money.amount / 10 ** money.scale)
  const sign = signed && money.amount > 0 ? '+' : ''
  return (
    <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', ...sx }} {...rest}>
      {sign}
      {formatted}
    </Box>
  )
}

/** Azúcar para pintar un total en micros (salida del motor de costos) sin pasar por money() a mano. */
export function MoneyFromMicros({ micros, currency, ...rest }) {
  return <MoneyValue money={fromMicros(micros, currency)} {...rest} />
}
