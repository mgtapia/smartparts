'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Slider from '@mui/material/Slider'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import MoneyValue from '@components/common/MoneyValue'
import Pill from '@components/common/Pill'
import {
  CONFIRMED_LOGISTICS_STATUSES,
  LOGISTICS_STATUS_LABELS_ES,
  SHIPPING_MODE_LABELS_ES,
  SHIPPING_MODES,
} from '@constants/enums'
import { LoadingState, ErrorState } from '@components/common/AsyncState'
import { GRID_GAP, px } from '@constants/layout'
import { useCostingCalculator } from './hooks/useCostingCalculator'

function usdMoney(usdAmount) {
  return { amount: Math.round(usdAmount * 100), currency: 'USD', scale: 2 }
}

export default function CostingCalculatorPage({ initialPartId }) {
  const {
    partsWithQuotes,
    part,
    partId,
    setPartId,
    quote,
    quoteId,
    setQuoteId,
    mode,
    setMode,
    marginBp,
    setMarginBp,
    tiers,
    setFreightForTier,
    loading,
    error,
  } = useCostingCalculator(initialPartId)

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

  if (partsWithQuotes.length === 0) {
    return (
      <ContentWidth>
        <PageHeader title="Costeo" description="Sin cotizaciones cargadas para calcular todavía." />
      </ContentWidth>
    )
  }

  return (
    <ContentWidth>
      <PageHeader
        title="Costeo"
        description="Landed cost real (motor de costos) + margen → precio de venta unitario y por volumen para ofrecer al cliente."
      />

      <Box sx={{ display: 'flex', gap: px(GRID_GAP), flexWrap: 'wrap', mb: px(GRID_GAP) }}>
        <Card sx={{ p: 2.5, flex: 1, minWidth: 260 }}>
          <Typography variant="overline" color="text.secondary">
            Repuesto
          </Typography>
          <Select
            fullWidth
            size="small"
            value={partId || ''}
            onChange={(e) => setPartId(e.target.value)}
            sx={{ mt: 1 }}
          >
            {partsWithQuotes.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nameEs}
              </MenuItem>
            ))}
          </Select>
        </Card>

        <Card sx={{ p: 2.5, flex: 1, minWidth: 260 }}>
          <Typography variant="overline" color="text.secondary">
            Cotización FOB
          </Typography>
          <Select
            fullWidth
            size="small"
            value={quoteId || ''}
            onChange={(e) => setQuoteId(e.target.value)}
            sx={{ mt: 1 }}
          >
            {part?.quotes.map((q) => (
              <MenuItem key={q.id} value={q.id}>
                {q.supplier?.name} —{' '}
                <MoneyValue money={usdMoney(q.unitPriceUsd)} sx={{ ml: 0.5 }} /> (
                {q.partType === 'original' ? 'original' : 'alternativo'})
              </MenuItem>
            ))}
          </Select>
        </Card>

        <Card sx={{ p: 2.5, flex: 1, minWidth: 220 }}>
          <Typography variant="overline" color="text.secondary">
            Modo de envío
          </Typography>
          <Select
            fullWidth
            size="small"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            sx={{ mt: 1 }}
          >
            {Object.values(SHIPPING_MODES).map((m) => (
              <MenuItem key={m} value={m}>
                {SHIPPING_MODE_LABELS_ES[m]}
              </MenuItem>
            ))}
          </Select>
        </Card>

        <Card sx={{ p: 2.5, flex: 1, minWidth: 220 }}>
          <Typography variant="overline" color="text.secondary">
            Margen: {(marginBp / 100).toFixed(0)}%
          </Typography>
          <Slider
            value={marginBp}
            onChange={(_, v) => setMarginBp(v)}
            min={0}
            max={10000}
            step={100}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${(v / 100).toFixed(0)}%`}
            sx={{ mt: 2 }}
          />
        </Card>
      </Box>

      <Card sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Precio por volumen — {part?.nameEs}
        </Typography>
        {part && !CONFIRMED_LOGISTICS_STATUSES.includes(part.logisticsStatus) ? (
          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 1 }}>
            Peso y volumen sin confirmar ({LOGISTICS_STATUS_LABELS_ES[part.logisticsStatus]}): el
            flete y el costo puesto en Chile son orientativos.
          </Typography>
        ) : null}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          landedNet (sin IVA) + margen. El flete es editable por tramo — el valor sugerido es una
          referencia, no una cotización real (ver docs/MOTOR-DE-COSTOS.md).
        </Typography>

        <Box sx={{ display: 'flex', gap: px(GRID_GAP), flexWrap: 'wrap' }}>
          {tiers.map((tier) => (
            <Box
              key={tier.qty}
              sx={{
                flex: 1,
                minWidth: 220,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {tier.qty} unidades
              </Typography>

              {tier.blocked ? (
                <>
                  <Pill label="Bloqueado" tone="error" />
                  <Typography variant="caption" color="error.main">
                    {tier.blockReasons.join(' ')}
                  </Typography>
                </>
              ) : (
                <>
                  <TextField
                    label="Flete cotizado (USD)"
                    type="number"
                    size="small"
                    value={tier.freightUsd}
                    onChange={(e) => setFreightForTier(tier.qty, Number(e.target.value))}
                    helperText={`Sugerido: $${tier.suggestedFreightUsd}`}
                  />
                  <Divider sx={{ my: 0.5 }} />
                  <Row label="Landed cost unitario">
                    <MoneyValue money={usdMoney(tier.unitLandedNetUsd)} />
                  </Row>
                  <Row label="Precio de venta unitario">
                    <MoneyValue
                      money={usdMoney(tier.unitSalePriceUsd)}
                      sx={{ fontWeight: 700, color: 'success.main' }}
                    />
                  </Row>
                  <Row label="Total de venta">
                    <MoneyValue money={usdMoney(tier.totalSalePriceUsd)} sx={{ fontWeight: 700 }} />
                  </Row>
                  <Row label="Margen por unidad">
                    <MoneyValue money={usdMoney(tier.marginUsdPerUnit)} />
                  </Row>
                </>
              )}
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />
        <Tooltip title="Disponible en Fase 2 — requiere escritura a Firestore (costing_scenarios)">
          <span>
            <Button variant="contained" disabled>
              Guardar escenario
            </Button>
          </span>
        </Tooltip>
      </Card>
    </ContentWidth>
  )
}

function Row({ label, children }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ typography: 'body2' }}>{children}</Box>
    </Box>
  )
}
