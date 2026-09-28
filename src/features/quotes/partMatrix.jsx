import Link from 'next/link'
import { makeMatcher } from '@libs/textSearch'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { MoneyFromMicros } from '@components/common/MoneyValue'
import UncertainValue from '@components/common/UncertainValue'
import { PART_TYPE } from '@constants/enums'
import { RADIUS } from '@constants/colors'
import { supplierLabel } from './constants'
import { costLine, priceUsdMicro } from './hooks/useQuotations'

export const METRICS = { PRICE: 'price', LANDED: 'landed' }
export const METRIC_OPTIONS = [
  { value: METRICS.PRICE, label: 'Precio del proveedor' },
  { value: METRICS.LANDED, label: 'Costo final en Chile' },
]

// "Cualquier calidad": al cliente no le importa si es original → se ofrece el
// más barato. "Solo OEM": el cliente pide pieza de fábrica. "Solo AFM": vista
// interna para saber si hay alternativa para cada repuesto.
export const QUALITY_FILTERS = { ANY: 'any', OEM: PART_TYPE.ORIGINAL, AFM: PART_TYPE.ALTERNATIVE }
export const QUALITY_OPTIONS = [
  { value: QUALITY_FILTERS.ANY, label: 'Cualquier calidad' },
  { value: QUALITY_FILTERS.OEM, label: 'Solo OEM' },
  { value: QUALITY_FILTERS.AFM, label: 'Solo AFM' },
]

// Motivo corto cuando no se puede calcular: un guion solo no dice por qué.
export const shortReason = (reason) => {
  if (/Sin Incoterm/.test(reason ?? '')) return 'Sin Incoterm'
  if (/Moneda sin definir/.test(reason ?? '')) return 'Sin moneda'
  if (/Falta/.test(reason ?? '')) return 'Falta dato'
  return '—'
}

const QUALITY_TAG = { [PART_TYPE.ORIGINAL]: 'OEM', [PART_TYPE.ALTERNATIVE]: 'AFM' }

/**
 * Valor de una línea según la métrica elegida:
 *  - precio: lo que cotizó el proveedor, llevado a USD (no requiere Incoterm).
 *  - costo final: puesto en Chile y sin IVA (requiere Incoterm y moneda).
 * `micro` es null cuando no se puede calcular; `reason` explica por qué.
 */
function valueOf(line, metric, costCtx) {
  if (metric === METRICS.PRICE) {
    const micro = priceUsdMicro(line.quote, costCtx.fx)
    if (micro === null) return { micro: null, verified: false, reason: 'Moneda sin definir' }
    return {
      micro,
      verified: line.quote.currencyConfirmed && !line.quote.inferred,
      reason: line.quote.inferred
        ? line.quote.inferredNote
        : `Moneda sin confirmar por el proveedor (${line.quote.currency}), llevada a USD con el tipo de cambio de referencia`,
    }
  }
  const cost = costLine(line, costCtx)
  if (cost.landedNetUsdMicro === null) {
    return { micro: null, verified: false, reason: cost.blockers.join('; ') }
  }
  const landed = cost.components.find((c) => c.code === 'landedNet')
  return {
    micro: landed.usdMicro,
    verified: landed.verified,
    reason: line.quote.inferred
      ? [line.quote.inferredNote, landed.reasonEs].filter(Boolean).join('; ')
      : landed.reasonEs,
  }
}

/**
 * Matriz de decisión: una fila por repuesto cotizado y una columna por
 * proveedor. Cada celda es UN valor: el más barato que ese proveedor ofrece
 * dentro de la calidad elegida (si hay varias variantes, también el más
 * barato). Los repuestos sin oferta de la calidad elegida siguen apareciendo,
 * en rojo en cada celda de proveedor — así se ve qué falta.
 */
export function buildMatrix(lines, metric, term, quality, costCtx) {
  const matches = makeMatcher(term)
  const accepts = (type) => quality === QUALITY_FILTERS.ANY || type === quality
  const supplierMap = new Map()
  const byPart = new Map()

  for (const line of lines) {
    if (
      !matches([
        line.part.nameEs,
        line.part.nameEn,
        line.part.code,
        line.part.categoryLabel,
        line.part.position,
      ])
    ) {
      continue
    }
    const { supplierId } = line.quote
    supplierMap.set(supplierId, supplierLabel(line.quote.supplier, supplierId))
    if (!byPart.has(line.part.id)) byPart.set(line.part.id, { part: line.part, cells: new Map() })
    if (!accepts(line.quote.partType)) continue

    const cells = byPart.get(line.part.id).cells
    const current = cells.get(supplierId)
    const value = valueOf(line, metric, costCtx)
    const variants = (current?.variants ?? 0) + 1
    const better =
      !current || (value.micro !== null && (current.micro === null || value.micro < current.micro))
    cells.set(supplierId, better ? { ...value, line, variants } : { ...current, variants })
  }

  const suppliers = [...supplierMap.entries()].map(([id, name]) => ({ id, name }))
  const rows = [...byPart.values()]
    .sort((a, b) => a.part.nameEs.localeCompare(b.part.nameEs, 'es'))
    .map((row) => {
      const priced = [...row.cells.entries()].filter(([, c]) => c.micro !== null)
      const best = priced.length > 1 ? priced.sort((a, b) => a[1].micro - b[1].micro)[0][0] : null
      return { ...row, best }
    })

  const columns = [
    {
      id: 'part',
      label: 'Repuesto',
      render: (r) => (
        <Link
          href={`/parts/${r.part.id}`}
          style={{ color: 'inherit', textDecoration: 'none' }}
          title={r.part.nameEs}
        >
          {r.part.nameEs}
          <Box component="span" sx={{ color: 'text.secondary', ml: 1, fontSize: 12 }}>
            {r.part.code ?? ''}
          </Box>
        </Link>
      ),
    },
    ...suppliers.map((s) => ({
      id: s.id,
      label: s.name,
      width: 120,
      align: 'right',
      tooltip: s.name,
      render: (r) => {
        const v = r.cells.get(s.id)
        if (!v) return '—'
        const tag = QUALITY_TAG[v.line.quote.partType]
        const variantNote =
          v.variants > 1 ? ` — ${v.variants} variantes, se muestra la más barata` : ''
        return (
          <Box
            title={`${tag}${variantNote}`}
            sx={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 1,
              borderRadius: `${RADIUS.inputSmall}px`,
              px: 1,
              bgcolor: r.best === s.id ? 'action.selected' : undefined,
            }}
          >
            <UncertainValue verified={v.micro !== null && v.verified} reason={v.reason}>
              {v.micro === null ? (
                shortReason(v.reason)
              ) : (
                <>
                  <MoneyFromMicros micros={v.micro} currency="USD" />
                  {v.variants > 1 ? '*' : ''}
                </>
              )}
            </UncertainValue>
            {quality === QUALITY_FILTERS.ANY && v.micro !== null ? (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                {tag}
              </Typography>
            ) : null}
          </Box>
        )
      },
    })),
  ]

  return { suppliers, rows, columns }
}
