'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import SectionTitle from '@components/common/SectionTitle'
import ListTable from '@components/common/ListTable'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import UncertainValue from '@components/common/UncertainValue'
import { TIER_LABELS_ES } from '@features/costing/pricingModel'
import { RED_REASON, formatClp, formatUsdCents } from '../constants'

const red = (children) => (
  <UncertainValue verified={false} reason={RED_REASON}>
    {children}
  </UncertainValue>
)

function Step({ number, title, note, children }) {
  return (
    <Card sx={{ p: 2 }}>
      <SectionTitle title={`${number}. ${title}`} description={note} />
      {children}
    </Card>
  )
}

/** Una línea de cuenta: descripción a la izquierda, importe a la derecha. */
function Line({ label, value, strong = false }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 2,
        py: 0.5,
        fontSize: 13,
        fontWeight: strong ? 600 : 400,
        borderTop: strong ? '1px solid' : undefined,
        borderColor: 'divider',
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </Box>
  )
}

/**
 * Cómo se llegó a las cifras de la recomendación de una opción, en el orden en que se calculan:
 * costo de cada repuesto, costo del pedido con los gastos por embarque, y precio y ahorro con el
 * margen elegido. Todo sale del análisis: acá no se calcula nada.
 */
export default function CalculationSteps({ option, data }) {
  const plan = data.scenarios[0].results[option].B
  const best = plan.single[0]
  const supplier = data.suppliers.find((s) => s.id === best.supplierIds[0])
  const calc = best.calc.find((c) => c.supplierId === best.supplierIds[0])
  const fx = data.assumptions.usdClp

  const items = [...best.items].sort(
    (x, y) => y.unitBaselineClp * y.qty - x.unitBaselineClp * x.qty,
  )
  const [partId, setPartId] = useState(items[0]?.partId)
  const item = items.find((i) => i.partId === partId) ?? items[0]

  const { pricing } = data
  const pct = (bp) => `${bp / 100} %`
  const capBp = item.quality === 'AFM' ? pricing.maxSavingAltBp : pricing.maxSavingOemBp
  const partOptions = items.map((i) => ({ value: i.partId, label: i.name }))

  const columns = [
    { id: 'name', label: 'Repuesto', render: (i) => i.name },
    { id: 'qty', label: 'Cant.', width: 60, align: 'right', render: (i) => i.qty },
    {
      id: 'kg',
      label: 'Kg cobrables',
      width: 110,
      align: 'right',
      render: (i) => i.chargeableKg.toLocaleString('es-CL'),
    },
    {
      id: 'unit',
      label: 'Costo unitario',
      width: 120,
      align: 'right',
      render: (i) => red(formatUsdCents(Math.round(i.unitCostUsdMicro / 10_000))),
    },
    {
      id: 'sub',
      label: 'Costo por cantidad',
      width: 140,
      align: 'right',
      render: (i) => red(formatUsdCents(Math.round((i.unitCostUsdMicro * i.qty) / 10_000))),
    },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Step
        number={1}
        title="Costo de cada repuesto puesto en Chile"
        note={`Con el proveedor recomendado, ${supplier.abbr}. Cada repuesto suma su precio, el transporte en China, el flete aéreo, el seguro, el arancel, los gastos en Chile y la transferencia. Los gastos que se cobran por embarque no entran acá.`}
      >
        <Box sx={{ mb: 1.5 }}>
          <ToolbarSelectBox
            label="Repuesto"
            value={item.partId}
            onChange={setPartId}
            options={partOptions}
          />
        </Box>
        {item.breakdown.map((l) => (
          <Box key={l.labelEs} sx={{ py: 0.5 }}>
            <Line label={l.labelEs} value={red(formatUsdCents(l.cents))} />
            <Typography variant="caption" color="text.secondary">
              {l.formulaEs}
            </Typography>
          </Box>
        ))}
        <Line
          label="Costo unitario en Chile, sin IVA"
          value={red(formatUsdCents(item.breakdown.reduce((sum, l) => sum + l.cents, 0)))}
          strong
        />
      </Step>

      <Step
        number={2}
        title="Costo del pedido"
        note={`Cantidad estimada de cada repuesto por su costo unitario, más los gastos que ${supplier.abbr} cobra una sola vez por embarque. Peso cobrable total: ${calc.kg.toLocaleString('es-CL')} kg.`}
      >
        <ListTable columns={columns} rows={items} getRowKey={(i) => i.partId} />
        <Box sx={{ mt: 1.5 }}>
          {calc.lines.map((l) => (
            <Line key={l.labelEs} label={l.labelEs} value={red(formatUsdCents(l.cents))} />
          ))}
          <Line
            label="Costo del pedido en dólares"
            value={red(formatUsdCents(calc.lines.reduce((sum, l) => sum + l.cents, 0)))}
            strong
          />
          <Line
            label={`Por el tipo de cambio de CLP ${fx.toLocaleString('es-CL')} por US$`}
            value={red(formatClp(best.costClp))}
          />
        </Box>
      </Step>

      <Step
        number={3}
        title="Precio de venta del repuesto"
        note={`El precio es el mayor entre lo que paga hoy el cliente menos el ahorro máximo (${pct(capBp)} en ${item.quality === 'AFM' ? 'alternativo' : 'original'}) y el costo con su parte de los gastos por embarque dividido por (1 − ${pct(pricing.minMarginBp)}), el margen mínimo sobre la venta.`}
      >
        <Line
          label="Costo con su parte de los gastos por embarque"
          value={red(formatClp(item.fullUnitCostClp))}
        />
        <Line
          label="Piso: costo ÷ (1 − margen mínimo)"
          value={red(formatClp(item.sale.floorClp))}
        />
        <Line
          label="Precio REF, lo que paga hoy el cliente"
          value={formatClp(item.unitBaselineClp)}
        />
        <Line
          label={`Objetivo: precio REF menos ${pct(capBp)}`}
          value={formatClp(Math.round((item.unitBaselineClp * (10000 - capBp)) / 10000))}
        />
        <Line
          label="PVP neto, el mayor de los dos redondeado a la centena"
          value={red(formatClp(item.sale.priceClp))}
          strong
        />
        <Line label="Tramo" value={TIER_LABELS_ES[item.sale.tier]} />
      </Step>

      <Step
        number={4}
        title="Resultado del pedido"
        note={`Suma del precio de venta de los ${best.covered} repuestos por su cantidad, frente a lo que el cliente paga hoy por esos mismos repuestos.`}
      >
        <Line label="PVP neto del pedido" value={red(formatClp(best.saleClp))} />
        <Line label="Costo del pedido en Chile" value={red(formatClp(best.costClp))} />
        <Line label="Ganancia nuestra" value={red(formatClp(best.profitClp))} strong />
        <Line label="Lo que el cliente paga hoy" value={formatClp(best.baselineClp)} />
        <Line label="Ahorro del cliente" value={red(formatClp(best.savingClp))} strong />
      </Step>
    </Box>
  )
}
