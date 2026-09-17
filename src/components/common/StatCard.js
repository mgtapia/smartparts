import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function StatCard({ label, value, hint, tone = 'neutral' }) {
  const valueColor =
    tone === 'success' ? 'success.main' : tone === 'warning' ? 'warning.main' : 'text.primary'
  return (
    <Card sx={{ p: 2.5, flex: 1, minWidth: 180 }}>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ typography: 'h5', fontWeight: 700, color: valueColor }}>{value}</Box>
      {hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {hint}
        </Typography>
      ) : null}
    </Card>
  )
}
