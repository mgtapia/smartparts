'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import MoneyValue from '@components/common/MoneyValue'
import Pill from '@components/common/Pill'
import { PART_TYPE, MATCH_STATUS } from '@constants/enums'
import { LoadingState, ErrorState } from '@components/common/AsyncState'
import { GRID_GAP, px } from '@constants/layout'
import { useQuoteComparator } from './hooks/useQuoteComparator'

const MATCH_STATUS_LABELS_ES = {
  [MATCH_STATUS.AUTO_CONFIRMED]: 'Auto-confirmado',
  [MATCH_STATUS.PENDING_REVIEW]: 'En revisión',
  [MATCH_STATUS.REJECTED]: 'Rechazado',
}
const MATCH_STATUS_TONE = {
  auto_confirmed: 'success',
  pending_review: 'warning',
  rejected: 'error',
}

export default function QuoteComparatorPage() {
  const { partsWithQuotes, selectedPart, selectedId, setSelectedId, loading, error } =
    useQuoteComparator()

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
        <PageHeader title="Cotizaciones" description="Sin cotizaciones cargadas todavía." />
      </ContentWidth>
    )
  }

  const cheapestId = selectedPart?.quotes
    .slice()
    .sort((a, b) => a.unitPriceUsd - b.unitPriceUsd)[0]?.id

  return (
    <ContentWidth>
      <PageHeader
        title="Cotizaciones"
        description={`${partsWithQuotes.length} repuestos con al menos una cotización.`}
      />

      <Box sx={{ display: 'flex', gap: px(GRID_GAP), alignItems: 'flex-start' }}>
        <Card sx={{ p: 1.5, width: 300, flexShrink: 0 }}>
          <Typography variant="overline" color="text.secondary" sx={{ pl: 1 }}>
            Repuesto
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            {partsWithQuotes.map((p) => (
              <Box
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                sx={{
                  p: 1.25,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  bgcolor: p.id === selectedId ? 'action.selected' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {p.nameEs}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {p.quotes.length} cotización{p.quotes.length !== 1 ? 'es' : ''}
                </Typography>
              </Box>
            ))}
          </Box>
        </Card>

        <Card sx={{ p: 2.5, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            {selectedPart?.nameEs}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Baseline: <MoneyValue money={selectedPart?.baselinePrice} />
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {selectedPart?.quotes.map((q) => (
              <Box
                key={q.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5,
                  border: '1px solid',
                  borderColor: q.id === cheapestId ? 'success.main' : 'divider',
                  borderRadius: 1.5,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {q.supplier?.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {q.supplier?.country} · {q.supplier?.platform} · MOQ {q.moq} ·{' '}
                    {q.supplier?.incoterm} · vence {q.validUntil}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Pill
                    label={q.partType === PART_TYPE.ORIGINAL ? 'Original' : 'Alternativo'}
                    tone="neutral"
                  />
                  <Pill
                    label={MATCH_STATUS_LABELS_ES[q.matchStatus]}
                    tone={MATCH_STATUS_TONE[q.matchStatus]}
                  />
                  <MoneyValue
                    money={{ amount: Math.round(q.unitPriceUsd * 100), currency: 'USD', scale: 2 }}
                    sx={{ fontWeight: 700, minWidth: 90, textAlign: 'right' }}
                  />
                  <Tooltip title="Disponible en Fase 2 — requiere escritura a Firestore">
                    <span>
                      <Button size="small" variant="outlined" disabled>
                        Usar esta
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        </Card>
      </Box>
    </ContentWidth>
  )
}
