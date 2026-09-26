'use client'

import Link from 'next/link'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { GRID_GAP, px } from '@constants/layout'
import { FOCUS_MARGIN_BP, OPTIONS } from '@features/trial/airTrialModel'
import { TRIAL_TABS } from '@features/trial/constants'
import { useAirTrial } from '@features/trial/hooks/useAirTrial'
import PlanCard from '@features/trial/components/PlanCard'
import ExcludedParts from '@features/trial/components/ExcludedParts'

const EXCLUDED_SHOWN = 8

const SectionHeader = ({ title, href, linkLabel }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
    <Typography variant="caption" color="text.secondary">
      {title}
    </Typography>
    <Typography
      variant="body2"
      component={Link}
      href={href}
      color="text.secondary"
      sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
    >
      {linkLabel}
    </Typography>
  </Box>
)

/**
 * Lo que decide la compra de prueba, traído a la Vista general: el proveedor recomendado por
 * opción del cliente y los repuestos que no se vuelan con lo que sobrecostaría hacerlo. Se monta
 * aparte porque el análisis completo tarda y no debe retrasar el resto de la página.
 */
export default function TrialSummary() {
  const { data, loading, error } = useAirTrial()
  if (loading || error || !data) return null

  return (
    <>
      <Box sx={{ mb: px(GRID_GAP) }}>
        <SectionHeader
          title={`Compra de prueba por avión · margen ${FOCUS_MARGIN_BP / 100} %`}
          href="/trial"
          linkLabel="Ver el análisis"
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
            gap: px(GRID_GAP),
          }}
        >
          {OPTIONS.map((opt) => (
            <PlanCard key={opt} option={opt} data={data} marginBp={FOCUS_MARGIN_BP} />
          ))}
        </Box>
      </Box>

      {data.logistics.length > 0 ? (
        <Box sx={{ mb: px(GRID_GAP) }}>
          <SectionHeader
            title={`Repuestos que no se vuelan (${data.logistics.length})`}
            href={`/trial?tab=${TRIAL_TABS.EXCLUDED}`}
            linkLabel="Ver todos"
          />
          <ExcludedParts logistics={data.logistics} limit={EXCLUDED_SHOWN} />
        </Box>
      ) : null}
    </>
  )
}
