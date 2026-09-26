import Link from 'next/link'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

/**
 * Título de una sección dentro de una página (bajo el `PageHeader`): título en negrita, una línea
 * de contexto opcional debajo y, a la derecha, un enlace a la pantalla completa.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {{ label: string, href: string }} [props.link]
 */
export default function SectionTitle({ title, description, link }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 2,
        mb: 1.5,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Box>
      {link ? (
        <Typography
          variant="body2"
          component={Link}
          href={link.href}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            flexShrink: 0,
            color: 'text.primary',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {link.label}
          <ArrowForwardIcon sx={{ fontSize: 16 }} />
        </Typography>
      ) : null}
    </Box>
  )
}
