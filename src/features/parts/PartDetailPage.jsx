'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import Link from 'next/link'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import MoneyValue from '@components/common/MoneyValue'
import Pill from '@components/common/Pill'
import { CODE_STATUS_LABELS_ES, PART_TYPE, MATCH_STATUS } from '@constants/enums'
import { LoadingState, ErrorState } from '@components/common/AsyncState'
import { GRID_GAP, SECTION_MARGIN_BOTTOM, px } from '@constants/layout'
import { usePartDetail } from './hooks/usePartDetail'

const CODE_STATUS_TONE = { confirmed: 'success', provisional: 'warning', missing: 'error' }
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

function DisabledAction({ label, reason }) {
  return (
    <Tooltip title={reason}>
      <span>
        <Button variant="outlined" size="small" disabled>
          {label}
        </Button>
      </span>
    </Tooltip>
  )
}

export default function PartDetailPage({ partId }) {
  const { part, loading, error } = usePartDetail(partId)

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

  if (!part) {
    return (
      <ContentWidth>
        <Typography variant="body2" color="text.secondary">
          Repuesto no encontrado.
        </Typography>
        <Button component={Link} href="/catalog" sx={{ mt: 2 }}>
          Volver al catálogo
        </Button>
      </ContentWidth>
    )
  }

  return (
    <ContentWidth>
      <PageHeader
        title={part.nameEs}
        description={`${part.vehicle?.brand} ${part.vehicle?.model} · ${part.category?.labelEs || part.categoryPath}`}
        actions={
          <>
            <DisabledAction
              label="Confirmar código"
              reason="Disponible en Fase 2 — requiere escritura a Firestore"
            />
            <DisabledAction
              label="Cargar cotización"
              reason="Disponible en Fase 2 — requiere escritura a Firestore"
            />
          </>
        }
      />

      <Box sx={{ display: 'flex', gap: px(GRID_GAP), flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Card sx={{ p: 2.5, flex: 1, minWidth: 300 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Identidad
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Row label="Código OEM">
              {part.oemCodes.length === 0 ? (
                <Pill label="Sin código" tone="error" />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="span" sx={{ fontFamily: '"Roboto Mono", monospace' }}>
                    {part.oemCodes[0].code}
                  </Box>
                  <Pill
                    label={CODE_STATUS_LABELS_ES[part.codeStatus]}
                    tone={CODE_STATUS_TONE[part.codeStatus]}
                  />
                </Box>
              )}
            </Row>
            <Row label="Posición">{part.position || '—'}</Row>
            <Row label="Peso / volumen estimado">
              {(part.weightG / 1000).toLocaleString('es-CL')} kg ·{' '}
              {(part.volumeCm3 / 1000).toLocaleString('es-CL')} L
            </Row>
            {part.sourcingNote ? (
              <>
                <Divider />
                <Typography variant="caption" color="warning.main">
                  {part.sourcingNote}
                </Typography>
              </>
            ) : null}
          </Box>
        </Card>

        <Card sx={{ p: 2.5, flex: 1, minWidth: 300 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Precio
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Row label="Baseline (lo que paga hoy)">
              <MoneyValue money={part.baselinePrice} sx={{ fontWeight: 700 }} />
              {part.includesVat ? null : (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  neto, sin IVA
                </Typography>
              )}
            </Row>
            <Row label="Mejor cotización original">
              {part.quoteRollup.original.minUsd !== null ? (
                <MoneyValue
                  money={{
                    amount: Math.round(part.quoteRollup.original.minUsd * 100),
                    currency: 'USD',
                    scale: 2,
                  }}
                />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Sin cotización todavía
                </Typography>
              )}
            </Row>
            <Row label="Mejor cotización alternativa">
              {part.quoteRollup.alternative.minUsd !== null ? (
                <MoneyValue
                  money={{
                    amount: Math.round(part.quoteRollup.alternative.minUsd * 100),
                    currency: 'USD',
                    scale: 2,
                  }}
                />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Sin cotización todavía
                </Typography>
              )}
            </Row>
            <Divider />
            <Button
              component={Link}
              href={`/costing?partId=${part.id}`}
              variant="contained"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            >
              Calcular landed cost
            </Button>
          </Box>
        </Card>
      </Box>

      <Card sx={{ p: 2.5, mt: px(SECTION_MARGIN_BOTTOM) }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Cotizaciones ({part.quotes.length})
        </Typography>
        {part.quotes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Sin cotizaciones todavía.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {part.quotes.map((q) => (
              <Box
                key={q.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.25,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {q.supplier?.name} ·{' '}
                    {q.partType === PART_TYPE.ORIGINAL ? 'Original' : 'Alternativo'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {q.supplier?.platform} · MOQ {q.moq} · vence {q.validUntil}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Pill
                    label={MATCH_STATUS_LABELS_ES[q.matchStatus]}
                    tone={MATCH_STATUS_TONE[q.matchStatus]}
                  />
                  <MoneyValue
                    money={{ amount: Math.round(q.unitPriceUsd * 100), currency: 'USD', scale: 2 }}
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Card>
    </ContentWidth>
  )
}

function Row({ label, children }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ typography: 'body2' }}>{children}</Box>
    </Box>
  )
}
