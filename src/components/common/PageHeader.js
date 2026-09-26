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
 * izquierda del título, en la misma fila. A la derecha van las `actions` y, al
 * final, `meta`: el dato corto de estado (ej. "592 de 592 repuestos."), siempre
 * el último. Junto al título van las pestañas de la sección y, debajo, las migas de pan (omitidas en la página principal). `description` es texto explicativo y va debajo del título.
 */
export default function PageHeader({ title, description, meta, actions, back }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        mb: 3,
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, minWidth: 0 }}>
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
          <Box sx={{ ml: 2 }}>
            <SectionTabs />
          </Box>
        </Box>
        <Breadcrumbs />
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {actions || meta ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {actions ? <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box> : null}
          {meta ? (
            <Typography variant="body2" color="text.secondary">
              {meta}
            </Typography>
          ) : null}
        </Box>
      ) : null}
    </Box>
  )
}
