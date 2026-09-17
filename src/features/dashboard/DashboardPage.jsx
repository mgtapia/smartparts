'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import StatCard from '@components/common/StatCard'
import MoneyValue from '@components/common/MoneyValue'
import Pill from '@components/common/Pill'
import { GRID_GAP, SECTION_MARGIN_BOTTOM, px } from '@constants/layout'
import { useDashboard } from './hooks/useDashboard'

const ANOMALY_LABELS = {
  missing_code: 'Sin código',
  price_conflict: 'Precio en conflicto',
  duplicate_position: 'Código repetido',
}

export default function DashboardPage() {
  const {
    partsCount,
    quoteCoveragePct,
    partsWithQuoteCount,
    savingsOpportunities,
    totalSavings,
    anomalies,
    expiringQuotes,
  } = useDashboard()

  return (
    <ContentWidth>
      <PageHeader
        title="Dashboard"
        description="Ahorro estimado contra lo que paga hoy el cliente, por dónde empezar y qué revisar."
      />

      <Box
        sx={{ display: 'flex', gap: px(GRID_GAP), flexWrap: 'wrap', mb: px(SECTION_MARGIN_BOTTOM) }}
      >
        <StatCard
          label="Ahorro estimado"
          value={<MoneyValue money={totalSavings} />}
          hint="Top 5 · baseline vs. mejor cotización"
          tone="success"
        />
        <StatCard
          label="Cobertura de cotizaciones"
          value={`${quoteCoveragePct}%`}
          hint={`${partsWithQuoteCount} de ${partsCount} repuestos`}
        />
        <StatCard
          label="Anomalías en el catálogo"
          value={anomalies.length}
          hint="Reportadas, no corregidas en silencio"
          tone={anomalies.length > 0 ? 'warning' : 'neutral'}
        />
        <StatCard
          label="Cotizaciones por vencer"
          value={expiringQuotes.length}
          hint="Próximos 7 días"
          tone={expiringQuotes.length > 0 ? 'warning' : 'neutral'}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: px(GRID_GAP), flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Card sx={{ p: 2.5, flex: 2, minWidth: 320 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Ranking de oportunidades de ahorro
          </Typography>
          {savingsOpportunities.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin cotizaciones cargadas todavía.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {savingsOpportunities.map((row) => (
                <Box
                  key={row.part.id}
                  component={Link}
                  href={`/parts/${row.part.id}`}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1.25,
                    borderRadius: 1.5,
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {row.part.nameEs}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.part.vehicle?.brand} {row.part.vehicle?.shortModel}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                    <MoneyValue
                      money={{ amount: row.savingsTotalClp, currency: 'CLP', scale: 0 }}
                    />
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Card>

        <Card sx={{ p: 2.5, flex: 1, minWidth: 280 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Anomalías detectadas
          </Typography>
          {anomalies.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin anomalías en el catálogo actual.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {anomalies.map((a, i) => (
                <Box key={i} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Pill label={ANOMALY_LABELS[a.type] || a.type} tone="warning" />
                  <Typography variant="caption" color="text.secondary">
                    {a.detail}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Card>
      </Box>
    </ContentWidth>
  )
}
