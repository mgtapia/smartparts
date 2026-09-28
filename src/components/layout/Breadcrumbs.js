'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import MuiBreadcrumbs from '@mui/material/Breadcrumbs'
import Typography from '@mui/material/Typography'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { findNavTrail } from '@constants/routes'

/** Migas de pan: Grupo › Módulo (› página actual en una ficha). Sin ruta en el menú o en la página principal no muestra nada. */
export default function Breadcrumbs({ current }) {
  const pathname = usePathname()
  const trail = findNavTrail(pathname)
  const deeper = Boolean(trail) && pathname.replace(/\/$/, '') !== trail.item.path
  // Sin grupo (o con el mismo nombre que su único módulo) y sin ficha, las migas repetirían el título.
  if (!trail || (!deeper && (!trail.group || trail.group === trail.item.labelEs))) return null
  const crumbs = [
    trail.group ? { label: trail.group } : null,
    { label: trail.item.labelEs, href: deeper ? trail.item.path : null },
    deeper ? { label: current || 'Detalle' } : null,
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
