'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Breadcrumbs from '@components/layout/Breadcrumbs'
import SectionTabs from '@components/layout/SectionTabs'
import { hasSectionTabs } from '@constants/routes'

/**
 * Encabezado de página. `back` ({ href, label }) pone una flecha de volver a la
 * izquierda del título; `actions` va pegado al título, en la misma fila (nunca
 * en una fila aparte: antes vivía en una columna propia junto a las pestañas
 * de sección y su alto empujaba todo el encabezado hacia abajo). A la derecha
 * van las pestañas de la sección del menú, ancladas al borde inferior. Debajo
 * del título van las migas de pan (omitidas en la página principal); nada más.
 */
export default function PageHeader({ title, actions, back }) {
  // Con pestañas de sección, el panel de contenido va pegado a su borde inferior.
  const attached = hasSectionTabs(usePathname())
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        mb: attached ? 0 : 2,
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, pb: attached ? 2 : 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          {back ? (
            <Tooltip title={back.label}>
              <IconButton
                component={Link}
                href={back.href}
                aria-label={back.label}
                size="small"
                sx={{ ml: -1 }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          <Typography variant="h5" component="h1">
            {title}
          </Typography>
          {actions}
        </Box>
        <Breadcrumbs />
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          alignSelf: 'stretch',
          flexShrink: 0,
        }}
      >
        <SectionTabs />
      </Box>
    </Box>
  )
}
