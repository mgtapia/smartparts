'use client'

import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import SectionPanel from '@components/layout/SectionPanel'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { ErrorState } from '@components/common/AsyncState'
import { ListPageSkeleton } from '@components/common/Skeletons'
import { GRID_GAP, px } from '@constants/layout'
import VehicleCard from './components/VehicleCard'
import { useVehicles } from './hooks/useVehicles'

export default function VehiclesPage() {
  const { rows, loading, error } = useVehicles()

  if (loading) {
    return (
      <ContentWidth>
        <ListPageSkeleton rows={4} />
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
      <PageHeader title="Vehículos" />
      <SectionPanel>
        {rows.length === 0 ? (
          <Typography color="text.secondary">Sin vehículos cargados todavía.</Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: px(GRID_GAP),
            }}
          >
            {rows.map((row) => (
              <VehicleCard key={row.vehicle.id} row={row} />
            ))}
          </Box>
        )}
      </SectionPanel>
    </ContentWidth>
  )
}
