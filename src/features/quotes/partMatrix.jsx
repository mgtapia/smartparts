import Link from 'next/link'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { MoneyFromMicros } from '@components/common/MoneyValue'
import UncertainValue from '@components/common/UncertainValue'
import { PART_TYPE } from '@constants/enums'
import { RADIUS } from '@constants/colors'
import { costLine, priceUsdMicro } from './hooks/useQuotations'

export const METRICS = { PRICE: 'price', LANDED: 'landed' }
export const METRIC_OPTIONS = [
  { value: METRICS.PRICE, label: 'Precio del proveedor' },
  { value: METRICS.LANDED, label: 'Costo final en Chile' },
]

export const QUALITY_FILTERS = { BOTH: 'both', OEM: PART_TYPE.ORIGINAL, AFM: PART_TYPE.ALTERNATIVE }
export const QUALITY_OPTIONS = [
  { value: QUALITY_FILTERS.BOTH, label: 'OEM + AFM' },
  { value: QUALITY_FILTERS.OEM, label: 'Solo OEM' },
  { value: QUALITY_FILTERS.AFM, label: 'Solo AFM' },
]

const ALL_QUALITIES = [
  { type: PART_TYPE.ORIGINAL, label: 'OEM' },
  { type: PART_TYPE.ALTERNATIVE, label: 'AFM' },
]

const normalize = (s) => (s ?? '').toString().toLowerCase()

/**
 * Valor de una línea según la métrica elegida:
 *  - precio: lo que cotizó el proveedor, llevado a USD (no requiere Incoterm).
 *  - costo final: puesto en Chile y sin IVA (requiere Incoterm y moneda).
 * `null` cuando no se puede calcular; en ese caso `reason` explica por qué.
 */
function valueOf(line, metric, costCtx) {
  if (metric === METRICS.PRICE) {
    const micro = priceUsdMicro(line.quote)
    if (micro === null) return { micro: null, verified: false, reason: 'Moneda sin definir' }
    return {
      micro,
      verified: line.quote.currencyConfirmed,
      reason: `Moneda sin confirmar por el proveedor (${line.quote.currency}), llevada a USD con el tipo de cambio de referencia`,
    }
  }
  const cost = costLine(line, costCtx)
  if (cost.landedNetUsdMicro === null) {
    return { micro: null, verified: false, reason: cost.blockers.join('; ') }
  }
  const landed = cost.components.find((c) => c.code === 'landedNet')
  return { micro: landed.usdMicro, verified: landed.verified, reason: landed.reasonEs }
}

/**
 * Matriz de decisión: una fila por repuesto y una columna por proveedor. Cada
 * celda muestra lo que ese proveedor ofrece de la pieza, una línea por calidad
 * (OEM / AFM). Si ofrece varias variantes de la misma pieza y calidad, muestra
 * la más barata. En cada fila va marcado el más barato de cada calidad.
 */
export function buildMatrix(lines, metric, term, qualityFilter, costCtx) {
  const combined = qualityFilter === QUALITY_FILTERS.BOTH
  const QUALITIES = ALL_QUALITIES.filter((q) => combined || q.type === qualityFilter)
  const supplierMap = new Map()
  const byPart = new Map()

  for (const line of lines) {
    if (!QUALITIES.some((q) => q.type === line.quote.partType)) continue
    if (
      term &&
      !normalize(line.part.nameEs).includes(term) &&
      !normalize(line.part.localCode?.code).includes(term)
    ) {
      continue
    }
    const { supplierId } = line.quote
    supplierMap.set(supplierId, line.quote.supplier?.name ?? supplierId)
    if (!byPart.has(line.part.id)) byPart.set(line.part.id, { part: line.part, cells: new Map() })
    const cell = byPart.get(line.part.id).cells.get(supplierId) ?? {}
    byPart.get(line.part.id).cells.set(supplierId, cell)

    const value = valueOf(line, metric, costCtx)
    const current = cell[line.quote.partType]
    const variants = (current?.variants ?? 0) + 1
    const better =
      !current || (value.micro !== null && (current.micro === null || value.micro < current.micro))
    cell[line.quote.partType] = better ? { ...value, line, variants } : { ...current, variants }
  }

  const suppliers = [...supplierMap.entries()].map(([id, name]) => ({ id, name }))
  const rows = [...byPart.values()]
    .sort((a, b) => a.part.nameEs.localeCompare(b.part.nameEs, 'es'))
    .map((row) => {
      // Más barato por calidad, solo si hay al menos dos proveedores que comparar.
      const best = {}
      for (const { type } of QUALITIES) {
        const priced = [...row.cells.entries()]
          .map(([supplierId, cell]) => [supplierId, cell[type]?.micro])
          .filter(([, micro]) => micro !== null && micro !== undefined)
        if (priced.length > 1) best[type] = priced.sort((a, b) => a[1] - b[1])[0][0]
      }
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
            {r.part.localCode?.code ?? ''}
          </Box>
        </Link>
      ),
    },
    ...suppliers.map((s) => ({
      id: s.id,
      label: s.name,
      width: 150,
      align: 'right',
      tooltip: s.name,
      render: (r) => {
        const cell = r.cells.get(s.id)
        const offered = QUALITIES.filter((q) => cell?.[q.type])
        if (offered.length === 0) return '—'
        return (
          <Box sx={{ lineHeight: 1.3 }}>
            {offered.map((q) => {
              const v = cell[q.type]
              const isBest = r.best[q.type] === s.id
              return (
                <Box
                  key={q.type}
                  title={v.variants > 1 ? `${v.variants} variantes: se muestra la más barata` : ''}
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 1,
                    borderRadius: `${RADIUS.inputSmall}px`,
                    px: 1,
                    bgcolor: isBest ? 'action.selected' : undefined,
                  }}
                >
                  {combined ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      {q.label}
                    </Typography>
                  ) : null}
                  {v.micro === null ? (
                    <UncertainValue verified={false} reason={v.reason}>
                      —
                    </UncertainValue>
                  ) : (
                    <UncertainValue verified={v.verified} reason={v.reason}>
                      <MoneyFromMicros micros={v.micro} currency="USD" />
                      {v.variants > 1 ? '*' : ''}
                    </UncertainValue>
                  )}
                </Box>
              )
            })}
          </Box>
        )
      },
    })),
  ]

  return { suppliers, rows, columns }
}
