import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import { vehicleLabel } from '../constants'

const STATS = [
  { label: 'Repuestos', value: (r) => r.parts.length },
  { label: 'Cotizados', value: (r) => r.quotedIds.size },
]

/** Tarjeta de un vehículo en la grilla: imagen, nombre, origen y año, y conteos clave. */
export default function VehicleCard({ row }) {
  const { vehicle } = row
  const detail = [vehicle.origin, vehicle.year].filter(Boolean).join(' · ')

  return (
    <Card
      component={Link}
      href={`/vehicles/${vehicle.id}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        color: 'inherit',
        textDecoration: 'none',
        overflow: 'hidden',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Box
        sx={{
          aspectRatio: '5 / 4',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
        }}
      >
        {vehicle.imageUrl ? (
          <Box
            component="img"
            src={vehicle.imageUrl}
            alt={vehicleLabel(vehicle)}
            title={vehicle.imageSource ?? undefined}
            sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : (
          <Typography variant="caption" color="error.main">
            Sin imagen
          </Typography>
        )}
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" noWrap>
          {vehicleLabel(vehicle)}
        </Typography>
        {detail ? (
          <Typography variant="body2" color="text.secondary" noWrap>
            {detail}
          </Typography>
        ) : null}
        <Box sx={{ display: 'flex', gap: 3, mt: 1.5 }}>
          {STATS.map((s) => (
            <Box key={s.label}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {s.label}
              </Typography>
              <Typography variant="body2">{s.value(row)}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Card>
  )
}
