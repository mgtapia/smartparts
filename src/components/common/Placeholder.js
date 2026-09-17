import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ContentWidth from './ContentWidth'
import PageHeader from './PageHeader'

/**
 * Placeholder de módulo — Fase 0/1. Se reemplaza por la pantalla real cuando
 * el módulo entra en el roadmap (ver .agent/ROADMAP.md).
 */
export default function Placeholder({ title, description }) {
  return (
    <ContentWidth>
      <PageHeader title={title} description={description} />
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          p: 6,
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Módulo pendiente de implementación.
        </Typography>
      </Box>
    </ContentWidth>
  )
}
