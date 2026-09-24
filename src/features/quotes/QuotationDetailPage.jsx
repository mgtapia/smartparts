'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Button from '@mui/material/Button'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import MoneyValue, { MoneyFromMicros } from '@components/common/MoneyValue'
import UncertainValue from '@components/common/UncertainValue'
import { LoadingState, ErrorState } from '@components/common/AsyncState'
import { PART_TYPE } from '@constants/enums'
import { COST_COLUMNS } from './constants'
import CostAssumptionsPanel from './components/CostAssumptionsPanel'
import { useCostAssumptions } from './hooks/useCostAssumptions'
import { useQuotationsData, costLine } from './hooks/useQuotations'

const SUPPLIER_TYPE_LABELS_ES = {
  factory: 'Fábrica',
  distributor: 'Distribuidor',
  dealer: 'Dealer',
}

const CELL_SX = { fontSize: 13, py: 0.75, px: 1, whiteSpace: 'nowrap' }
const HEAD_SX = { ...CELL_SX, color: 'text.secondary', fontWeight: 600 }

const formatDate = (d) => (d ? d.toLocaleDateString('es-CL') : '—')

export default function QuotationDetailPage({ quotationId }) {
  const { quotations, loading, error } = useQuotationsData()
  const assumptions = useCostAssumptions()
  const { mode, rates, settingsFor } = assumptions

  const quotation = quotations.find((q) => q.id === quotationId) ?? null

  const rows = useMemo(() => {
    if (!quotation) return []
    return quotation.lines
      .map((line) => {
        const cost = costLine(line, { mode, rates, settingsFor })
        return { line, cost, byCode: Object.fromEntries(cost.components.map((c) => [c.code, c])) }
      })
      .sort((a, b) => a.line.part.nameEs.localeCompare(b.line.part.nameEs, 'es'))
  }, [quotation, mode, rates, settingsFor])

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
  if (!quotation) {
    return (
      <ContentWidth>
        <PageHeader title="Cotización no encontrada" />
        <Button component={Link} href="/quotes">
          Volver a cotizaciones
        </Button>
      </ContentWidth>
    )
  }

  const supplier = quotation.supplier
  const sample = rows.find((r) => r.cost.components.length > 0)
  const declarations = supplier?.declarations ?? []

  return (
    <ContentWidth>
      <Button component={Link} href="/quotes" size="small" sx={{ mb: 1, textTransform: 'none' }}>
        ← Cotizaciones
      </Button>
      <PageHeader
        title={supplier?.name ?? 'Proveedor'}
        description={quotation.sourceFile ?? 'Sin archivo de origen'}
      />

      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Info label="Tipo">
            <UncertainValue verified={false} reason="Declarado por el proveedor, sin verificar">
              {SUPPLIER_TYPE_LABELS_ES[supplier?.supplier_type] ?? 'Sin confirmar'}
            </UncertainValue>
          </Info>
          <Info label="Incoterm">
            {quotation.incoterms.join(', ') || (
              <UncertainValue verified={false} reason="La cotización no indica Incoterm">
                Sin definir
              </UncertainValue>
            )}
          </Info>
          <Info label="Moneda">
            <UncertainValue
              verified={quotation.currencyConfirmed}
              reason="Moneda sin confirmar por el proveedor"
            >
              {quotation.currencies.join(', ')}
            </UncertainValue>
          </Info>
          <Info label="Fecha">{formatDate(quotation.capturedAt)}</Info>
          <Info label="Vigencia">
            {quotation.validUntil ?? (
              <UncertainValue verified={false} reason="La cotización no indica vigencia">
                Sin vigencia
              </UncertainValue>
            )}
          </Info>
          <Info label="Líneas">{quotation.lineCount}</Info>
        </Box>
        {declarations.length > 0 ? (
          <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1.5 }}>
            Lo que declara el proveedor (sin verificar): {declarations.join(' · ')}
          </Typography>
        ) : null}
      </Card>

      <CostAssumptionsPanel
        mode={mode}
        setMode={assumptions.setMode}
        rates={rates}
        setRates={assumptions.setRates}
        suppliers={[{ id: quotation.supplierId, name: supplier?.name ?? quotation.supplierId }]}
        settingsFor={settingsFor}
        updateSupplier={assumptions.updateSupplier}
        onReset={assumptions.reset}
      />

      <Card sx={{ mb: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Pieza', 'Categoría', 'Lugar', 'Código', 'Calidad', 'Variante', 'Precio'].map(
                (h) => (
                  <TableCell key={h} sx={HEAD_SX}>
                    {h}
                  </TableCell>
                ),
              )}
              {COST_COLUMNS.map((c) => (
                <TableCell key={c.code} sx={{ ...HEAD_SX, textAlign: 'right' }}>
                  {c.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(({ line, cost, byCode }) => {
              const { part, quote } = line
              return (
                <TableRow key={quote.id} hover>
                  <TableCell sx={CELL_SX}>
                    <Link href={`/parts/${part.id}`}>{part.nameEs}</Link>
                  </TableCell>
                  <TableCell sx={CELL_SX}>{part.categoryLabel}</TableCell>
                  <TableCell sx={CELL_SX}>{part.position ?? '—'}</TableCell>
                  <TableCell sx={CELL_SX}>{part.localCode?.code ?? '—'}</TableCell>
                  <TableCell sx={CELL_SX}>
                    <UncertainValue
                      verified={false}
                      reason="Calidad declarada por el proveedor: se confirma con foto o muestra"
                    >
                      {quote.partType === PART_TYPE.ORIGINAL ? 'Original' : 'Alternativo'}
                    </UncertainValue>
                  </TableCell>
                  <TableCell sx={CELL_SX}>{quote.variant ?? '—'}</TableCell>
                  <TableCell sx={CELL_SX}>
                    <UncertainValue
                      verified={quote.currencyConfirmed}
                      reason="Moneda sin confirmar por el proveedor"
                    >
                      {quote.currency ? (
                        <MoneyValue money={quote.price} />
                      ) : (
                        quote.priceAmount.toFixed(2)
                      )}
                    </UncertainValue>
                    {quote.priceTiers.length > 1 ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block' }}
                      >
                        {quote.priceTiers
                          .slice()
                          .sort((a, b) => b.minQty - a.minQty)
                          .map(
                            (t) =>
                              `${t.minQty === 1 ? '<10' : `≥${t.minQty}`}: ${t.amount.toFixed(2)}`,
                          )
                          .join(' · ')}
                      </Typography>
                    ) : null}
                  </TableCell>
                  {cost.blockers.length > 0 ? (
                    <TableCell colSpan={COST_COLUMNS.length} sx={CELL_SX}>
                      <UncertainValue verified={false} reason="No se puede costear esta línea">
                        {cost.blockers.join('; ')}
                      </UncertainValue>
                    </TableCell>
                  ) : (
                    COST_COLUMNS.map((c) => {
                      const comp = byCode[c.code]
                      return (
                        <TableCell key={c.code} sx={{ ...CELL_SX, textAlign: 'right' }}>
                          <UncertainValue verified={comp.verified} reason={comp.reasonEs}>
                            <MoneyFromMicros micros={comp.usdMicro} currency="USD" />
                          </UncertainValue>
                        </TableCell>
                      )
                    })
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      {sample ? (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Cómo se calcula cada costo
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Por unidad. Ejemplo con la primera línea ({sample.line.part.nameEs}); las fórmulas son
            las mismas para todas. Rojo = todavía no verificado.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {sample.cost.components.map((c) => (
              <Box key={c.code}>
                <Typography variant="body2">
                  <UncertainValue verified={c.verified} reason={c.reasonEs}>
                    {c.labelEs}
                  </UncertainValue>
                  {' — '}
                  {c.formulaEs}
                </Typography>
                {c.reasonEs ? (
                  <Typography variant="caption" color="error.main">
                    Sin verificar: {c.reasonEs}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Box>
        </Card>
      ) : null}
    </ContentWidth>
  )
}

function Info({ label, children }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2">{children}</Typography>
    </Box>
  )
}
