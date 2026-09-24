import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

/**
 * Encabezado de página. `meta` es el dato corto de estado (ej. "592 de 592
 * repuestos.") y va en la misma fila que el título, alineado a la derecha;
 * `description` es texto explicativo y va debajo del título.
 */
export default function PageHeader({ title, description, meta, actions }) {
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
        <Box
          sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}
        >
          <Typography variant="h5" component="h1">
            {title}
          </Typography>
          {meta ? (
            <Typography variant="body2" color="text.secondary">
              {meta}
            </Typography>
          ) : null}
        </Box>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {actions ? <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box> : null}
    </Box>
  )
}
