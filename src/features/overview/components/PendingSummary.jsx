'use client'

import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import UncertainValue from '@components/common/UncertainValue'
import { GRID_GAP } from '@constants/layout'
import { usePending } from '@features/pending/hooks/usePending'

const SHOWN = 5

/**
 * Lo que falta confirmar para decidir, tomado de Pendientes. Cada fila lleva a
 * la pantalla que lo resuelve; en rojo porque son datos sin verificar.
 */
export default function PendingSummary() {
  const { data, loading, error } = usePending()
  if (loading || error || !data) return null

  const { pending } = data
  if (pending.length === 0) return null

  return (
    <Card sx={{ p: 2, mb: `${GRID_GAP}px` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Por resolver
        </Typography>
        <Typography
          variant="body2"
          component={Link}
          href="/pending"
          color="text.secondary"
          sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          Ver los {pending.length} pendientes
        </Typography>
      </Box>
      {pending.slice(0, SHOWN).map((item) => (
        <Box
          key={item.id}
          component={Link}
          href={item.href}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            py: 0.75,
            color: 'inherit',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <Typography variant="body2" noWrap>
            {item.label}
          </Typography>
          <UncertainValue verified={false} reason="Dato sin confirmar con fuente">
            <Typography variant="body2" component="span">
              {item.count}
            </Typography>
          </UncertainValue>
        </Box>
      ))}
    </Card>
  )
}
