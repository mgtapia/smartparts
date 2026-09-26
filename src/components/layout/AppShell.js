'use client'

import Box from '@mui/material/Box'
import { usePersistentState } from '@hooks/usePersistentState'
import { CONTENT_GAP, CONTENT_RADIUS, px } from '@constants/layout'
import AppRail from './AppRail'
import AppTopBar from './AppTopBar'

// Barra de desplazamiento fina y sin flechas (estándar: Chrome ≥ 121 ignora los
// pseudo-elementos ::-webkit-scrollbar cuando estas propiedades están definidas).
const scrollbarSx = {
  scrollbarWidth: 'thin',
  scrollbarColor: (theme) => `${theme.palette.text.disabled} transparent`,
}

export default function AppShell({ children }) {
  const [expanded, setExpanded] = usePersistentState('rail.expanded', false)

  return (
    <Box
      sx={{
        bgcolor: 'brand.railBg',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppTopBar expanded={expanded} onToggleMenu={() => setExpanded((v) => !v)} />
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <AppRail expanded={expanded} />
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            mr: px(CONTENT_GAP),
            mb: px(CONTENT_GAP),
            borderRadius: px(CONTENT_RADIUS),
            overflow: 'hidden',
            bgcolor: 'brand.bodyBg',
          }}
        >
          <Box
            sx={{ flex: 1, minWidth: 0, overflowY: 'auto', p: { xs: 2, md: 4 }, ...scrollbarSx }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
