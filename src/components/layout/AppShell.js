'use client'

import Box from '@mui/material/Box'
import { usePersistentState } from '@hooks/usePersistentState'
import { CONTENT_GAP, CONTENT_RADIUS, px } from '@constants/layout'
import AppRail from './AppRail'
import AppTopBar from './AppTopBar'

// Barra de desplazamiento dentro de la ventana redondeada: pulgar fino y redondeado,
// sin flechas ni pista, separado de las esquinas. Chrome ignora ::-webkit-scrollbar si
// están definidas las propiedades estándar, así que estas solo van donde no hay -webkit.
const scrollbarSx = {
  '&::-webkit-scrollbar': { width: 14 },
  '&::-webkit-scrollbar-track': { background: 'transparent', marginBlock: px(CONTENT_RADIUS) },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: (theme) => theme.palette.text.disabled,
    borderRadius: px(7),
    border: '4px solid transparent',
    backgroundClip: 'padding-box',
  },
  '&::-webkit-scrollbar-button': { display: 'none' },
  '@supports not selector(::-webkit-scrollbar)': {
    scrollbarWidth: 'thin',
    scrollbarColor: (theme) => `${theme.palette.text.disabled} transparent`,
  },
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
