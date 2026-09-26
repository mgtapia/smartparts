'use client'

import Box from '@mui/material/Box'
import SectionTitle from '@components/common/SectionTitle'
import { GRID_GAP, px } from '@constants/layout'
import { OPTIONS } from '@features/trial/airTrialModel'
import { TRIAL_TABS } from '@features/trial/constants'
import { useAirTrial } from '@features/trial/hooks/useAirTrial'
import PlanCard from '@features/trial/components/PlanCard'
import ExcludedParts from '@features/trial/components/ExcludedParts'

const EXCLUDED_SHOWN = 8

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
        <SectionTitle
          title="Compra de prueba por avión"
          description={`Proveedor recomendado para cada opción del cliente, con la fórmula de precio de venta de Ajustes: margen mínimo aéreo y ahorro máximo del cliente.`}
          link={{ label: 'Ver el análisis', href: '/trial' }}
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
            gap: px(GRID_GAP),
          }}
        >
          {OPTIONS.map((opt) => (
            <PlanCard key={opt} option={opt} data={data} />
          ))}
        </Box>
      </Box>

      {data.logistics.length > 0 ? (
        <Box sx={{ mb: px(GRID_GAP) }}>
          <SectionTitle
            title="Repuestos que no se vuelan"
            description={`${data.logistics.length} repuestos cuestan más por avión que lo que paga hoy el cliente, o no pueden ir en él.`}
            link={{ label: 'Ver todos', href: `/trial?tab=${TRIAL_TABS.EXCLUDED}` }}
          />
          <ExcludedParts logistics={data.logistics} limit={EXCLUDED_SHOWN} />
        </Box>
      ) : null}
    </>
  )
}
