'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import ListTable from '@components/common/ListTable'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import UncertainValue from '@components/common/UncertainValue'
import { RED_REASON, formatClp, formatUsdCents } from '../constants'

const red = (children) => (
  <UncertainValue verified={false} reason={RED_REASON}>
    {children}
  </UncertainValue>
)

const priceWithMargin = (cost, bp) => Math.round((cost * (10000 + bp)) / 10000)

function Step({ number, title, note, children }) {
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="overline" color="text.secondary">
        Paso {number}
      </Typography>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {note}
      </Typography>
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
export default function CalculationSteps({ option, data, marginBp }) {
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

  const price = priceWithMargin(best.costClp, marginBp)
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
        title="Precio al cliente y ahorro"
        note={`El margen de ${marginBp / 100} % se aplica sobre el costo del pedido. El ahorro compara con lo que el cliente paga hoy por esos mismos ${best.covered} repuestos.`}
      >
        <Line label="Costo del pedido en Chile" value={red(formatClp(best.costClp))} />
        <Line
          label={`Margen de ${marginBp / 100} %`}
          value={red(formatClp(price - best.costClp))}
        />
        <Line label="Precio al cliente" value={red(formatClp(price))} strong />
        <Line label="Lo que el cliente paga hoy" value={formatClp(best.baselineClp)} />
        <Line label="Ahorro del cliente" value={red(formatClp(best.baselineClp - price))} strong />
      </Step>
    </Box>
  )
}
