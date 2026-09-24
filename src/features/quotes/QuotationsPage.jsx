'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import { MoneyFromMicros } from '@components/common/MoneyValue'
import UncertainValue from '@components/common/UncertainValue'
import { LoadingState, ErrorState } from '@components/common/AsyncState'
import { PART_TYPE } from '@constants/enums'
import CostAssumptionsPanel from './components/CostAssumptionsPanel'
import { useCostAssumptions } from './hooks/useCostAssumptions'
import { useQuotationsData, costLine } from './hooks/useQuotations'

const CELL_SX = { fontSize: 13, py: 1, px: 1.5 }
const HEAD_SX = { ...CELL_SX, color: 'text.secondary', fontWeight: 600 }
const SUPPLIER_TYPE_LABELS_ES = {
  factory: 'Fábrica',
  distributor: 'Distribuidor',
  dealer: 'Dealer',
}
const formatDate = (d) => (d ? d.toLocaleDateString('es-CL') : '—')

export default function QuotationsPage() {
  const { lines, quotations, loading, error } = useQuotationsData()
  const [tab, setTab] = useState('list')

  if (loading) {
    return (
      <ContentWidth>
        <LoadingState />
      </ContentWidth>
    )
  }
  if (error) {
    return (
      <ContentWidth>
        <ErrorState />
      </ContentWidth>
    )
  }

  return (
    <ContentWidth>
      <PageHeader
        title="Cotizaciones"
        description="Lo que cotizó cada proveedor, y cuánto nos costaría cada repuesto puesto en Chile."
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="list" label={`Cotizaciones (${quotations.length})`} />
        <Tab value="matrix" label="Matriz por repuesto" />
      </Tabs>
      {tab === 'list' ? <QuotationsList quotations={quotations} /> : <PartMatrix lines={lines} />}
    </ContentWidth>
  )
}

function QuotationsList({ quotations }) {
  if (quotations.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sin cotizaciones cargadas todavía.
      </Typography>
    )
  }
  return (
    <Card sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {[
              'Proveedor',
              'Tipo',
              'Archivo',
              'Fecha',
              'Incoterm',
              'Moneda',
              'Líneas',
              'Original / Alt.',
              'Por revisar',
              'Vigencia',
            ].map((h) => (
              <TableCell key={h} sx={HEAD_SX}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {quotations.map((q) => (
            <TableRow
              key={q.id}
              hover
              component={Link}
              href={`/quotes/${q.id}`}
              sx={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <TableCell sx={CELL_SX}>{q.supplier?.name ?? q.supplierId}</TableCell>
              <TableCell sx={CELL_SX}>
                <UncertainValue verified={false} reason="Declarado por el proveedor, sin verificar">
                  {SUPPLIER_TYPE_LABELS_ES[q.supplier?.supplier_type] ?? 'Sin confirmar'}
                </UncertainValue>
              </TableCell>
              <TableCell sx={CELL_SX}>{q.sourceFile ?? '—'}</TableCell>
              <TableCell sx={CELL_SX}>{formatDate(q.capturedAt)}</TableCell>
              <TableCell sx={CELL_SX}>
                {q.incoterms.length > 0 ? (
                  q.incoterms.join(', ')
                ) : (
                  <UncertainValue verified={false} reason="La cotización no indica Incoterm">
                    Sin definir
                  </UncertainValue>
                )}
              </TableCell>
              <TableCell sx={CELL_SX}>
                <UncertainValue
                  verified={q.currencyConfirmed}
                  reason="Moneda sin confirmar por el proveedor"
                >
                  {q.currencies.join(', ')}
                </UncertainValue>
              </TableCell>
              <TableCell sx={CELL_SX}>{q.lineCount}</TableCell>
              <TableCell sx={CELL_SX}>
                {q.originalCount} / {q.alternativeCount}
              </TableCell>
              <TableCell sx={CELL_SX}>
                <UncertainValue
                  verified={q.pendingCount === 0}
                  reason="Calidad y emparejamiento pendientes de revisión humana"
                >
                  {q.pendingCount}
                </UncertainValue>
              </TableCell>
              <TableCell sx={CELL_SX}>
                {q.validUntil ?? (
                  <UncertainValue verified={false} reason="La cotización no indica vigencia">
                    Sin vigencia
                  </UncertainValue>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

/**
 * Matriz de decisión: una fila por repuesto, una columna por proveedor, cada
 * celda con el costo final unitario (puesto en Chile, sin IVA) del proveedor
 * para la calidad elegida. El mejor de cada fila va marcado. Comparar siempre
 * en costo final, nunca en precio EXW: el EXW no incluye lo que le falta para
 * llegar a Chile, y eso cambia según el proveedor.
 */
function PartMatrix({ lines }) {
  const assumptions = useCostAssumptions()
  const { mode, rates, settingsFor } = assumptions
  const [quality, setQuality] = useState(PART_TYPE.ALTERNATIVE)

  const { suppliers, rows, wins } = useMemo(() => {
    const supplierMap = new Map()
    const byPart = new Map()
    for (const line of lines) {
      if (line.quote.partType !== quality) continue
      const cost = costLine(line, { mode, rates, settingsFor })
      if (cost.landedNetUsdMicro === null) continue
      supplierMap.set(line.quote.supplierId, line.quote.supplier?.name ?? line.quote.supplierId)
      if (!byPart.has(line.part.id)) byPart.set(line.part.id, { part: line.part, cells: new Map() })
      const cells = byPart.get(line.part.id).cells
      const current = cells.get(line.quote.supplierId)
      const entry = { line, cost, variants: (current?.variants ?? 0) + 1 }
      if (!current || cost.landedNetUsdMicro < current.cost.landedNetUsdMicro) {
        cells.set(line.quote.supplierId, entry)
      } else {
        cells.set(line.quote.supplierId, { ...current, variants: entry.variants })
      }
    }
    const supplierList = [...supplierMap.entries()].map(([id, name]) => ({ id, name }))
    const winCount = Object.fromEntries(supplierList.map((s) => [s.id, 0]))
    const rowList = [...byPart.values()]
      .sort((a, b) => a.part.nameEs.localeCompare(b.part.nameEs, 'es'))
      .map((r) => {
        let best = null
        for (const [supplierId, cell] of r.cells) {
          if (
            best === null ||
            cell.cost.landedNetUsdMicro < r.cells.get(best).cost.landedNetUsdMicro
          )
            best = supplierId
        }
        if (best !== null && r.cells.size > 1) winCount[best] += 1
        return { ...r, best: r.cells.size > 1 ? best : null }
      })
    return { suppliers: supplierList, rows: rowList, wins: winCount }
  }, [lines, quality, mode, rates, settingsFor])

  return (
    <>
      <CostAssumptionsPanel
        mode={mode}
        setMode={assumptions.setMode}
        rates={rates}
        setRates={assumptions.setRates}
        suppliers={suppliers}
        settingsFor={settingsFor}
        updateSupplier={assumptions.updateSupplier}
        onReset={assumptions.reset}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
        <Select
          size="small"
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          sx={{ width: 170 }}
        >
          <MenuItem value={PART_TYPE.ALTERNATIVE}>Calidad alternativa</MenuItem>
          <MenuItem value={PART_TYPE.ORIGINAL}>Calidad original</MenuItem>
        </Select>
        <Typography variant="caption" color="text.secondary">
          Costo final por unidad, puesto en Chile y sin IVA. El mejor de cada fila va marcado; se
          compara siempre el costo final, no el precio EXW. Rojo = estimado, sin verificar.
        </Typography>
      </Box>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No hay cotizaciones con costo calculable para esta calidad.
        </Typography>
      ) : (
        <Card sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={HEAD_SX}>Repuesto</TableCell>
                {suppliers.map((s) => (
                  <TableCell key={s.id} sx={{ ...HEAD_SX, textAlign: 'right' }}>
                    {s.name}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      más barato en {wins[s.id]}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.part.id} hover>
                  <TableCell sx={CELL_SX}>
                    <Link href={`/parts/${r.part.id}`}>{r.part.nameEs}</Link>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {r.part.localCode?.code ?? 'sin código'}
                    </Typography>
                  </TableCell>
                  {suppliers.map((s) => {
                    const cell = r.cells.get(s.id)
                    if (!cell) {
                      return (
                        <TableCell key={s.id} sx={{ ...CELL_SX, textAlign: 'right' }}>
                          —
                        </TableCell>
                      )
                    }
                    const landed = cell.cost.components.find((c) => c.code === 'landedNet')
                    const price = cell.cost.components.find((c) => c.code === 'price')
                    const isBest = r.best === s.id
                    return (
                      <TableCell
                        key={s.id}
                        sx={{
                          ...CELL_SX,
                          textAlign: 'right',
                          bgcolor: isBest ? 'action.selected' : undefined,
                        }}
                      >
                        <UncertainValue verified={landed.verified} reason={landed.reasonEs}>
                          <MoneyFromMicros micros={landed.usdMicro} currency="USD" />
                        </UncertainValue>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {cell.line.quote.incoterm}{' '}
                          <MoneyFromMicros micros={price.usdMicro} currency="USD" />
                          {cell.variants > 1 ? ` · ${cell.variants} variantes` : ''}
                          {cell.line.quote.variant ? ` · ${cell.line.quote.variant}` : ''}
                        </Typography>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  )
}
