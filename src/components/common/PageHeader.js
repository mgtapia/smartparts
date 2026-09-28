import Link from 'next/link'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Breadcrumbs from '@components/layout/Breadcrumbs'
import SectionTabs from '@components/layout/SectionTabs'

/**
 * Encabezado de página. `back` ({ href, label }) pone una flecha de volver a la
 * izquierda del título, en la misma fila. A la derecha, separadas del título,
 * van las pestañas de la sección del menú y las `actions`. Debajo del título
 * van las migas de pan (omitidas en la página principal) y `description`, el
 * texto explicativo.
 */
export default function PageHeader({ title, description, actions, back }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        mb: 2,
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
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
        </Box>
        <Breadcrumbs />
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <SectionTabs />
        {actions ? <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box> : null}
      </Box>
    </Box>
  )
}
