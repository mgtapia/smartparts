import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: 'brand.railBg',
        color: 'white',
      }}
    >
      <Image src="/assets/brand/logo-smartdeal-white.svg" alt="SmartDeal" width={160} height={40} />
      <Typography variant="body2" sx={{ opacity: 0.7 }}>
        SmartParts — Auth Google pendiente (Fase 2, ver .agent/ROADMAP.md)
      </Typography>
    </Box>
  )
}
