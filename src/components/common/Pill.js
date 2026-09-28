import Chip from '@mui/material/Chip'
import { COLORS } from '@constants/colors'

const TONES = {
  neutral: {
    bgcolor: COLORS.bgWarm,
    color: COLORS.textPrimary,
    border: `1px solid ${COLORS.borderStrong}`,
  },
  success: { bgcolor: COLORS.infoBg, color: COLORS.successStrong },
  warning: { bgcolor: COLORS.warningBg, color: COLORS.warning },
  error: { bgcolor: COLORS.errorBg, color: COLORS.error },
  lime: { bgcolor: COLORS.lime, color: COLORS.limeInk },
}

/** Badge pequeño para estados de dominio (code_status, demand_scale, part_type…). */
export default function Pill({ label, tone = 'neutral' }) {
  const style = TONES[tone] || TONES.neutral
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        ...style,
        fontWeight: 600,
        justifyContent: 'center',
        '& .MuiChip-label': { px: 1, lineHeight: 1, textAlign: 'center' },
      }}
    />
  )
}
