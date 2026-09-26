'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import MuiBreadcrumbs from '@mui/material/Breadcrumbs'
import Typography from '@mui/material/Typography'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { findNavTrail } from '@constants/routes'

/** Migas de pan: Grupo › Módulo (› Detalle en una ficha). Sin ruta en el menú o en la página principal no muestra nada. */
export default function Breadcrumbs() {
  const trail = findNavTrail(usePathname())
  // Sin grupo ni ficha es un módulo de primer nivel (Vista general): no hay ruta que mostrar.
  if (!trail || (!trail.group && !trail.detail)) return null
  const crumbs = [
    trail.group ? { label: trail.group } : null,
    { label: trail.item.labelEs, href: trail.detail ? trail.item.path : null },
    trail.detail ? { label: 'Detalle' } : null,
  ].filter(Boolean)

  return (
    <MuiBreadcrumbs
      aria-label="Ubicación"
      separator={<ChevronRightIcon sx={{ fontSize: 16, display: 'block' }} />}
      sx={{
        mt: 0.5,
        '& .MuiBreadcrumbs-ol': { alignItems: 'center' },
        '& .MuiBreadcrumbs-separator': { display: 'flex', alignItems: 'center' },
      }}
    >
      {crumbs.map((c) =>
        c.href ? (
          <Typography
            key={c.label}
            variant="body2"
            component={Link}
            href={c.href}
            color="text.secondary"
            sx={{
              lineHeight: 1,
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {c.label}
          </Typography>
        ) : (
          <Typography key={c.label} variant="body2" color="text.secondary" sx={{ lineHeight: 1 }}>
            {c.label}
          </Typography>
        ),
      )}
    </MuiBreadcrumbs>
  )
}
