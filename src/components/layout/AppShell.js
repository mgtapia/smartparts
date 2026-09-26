'use client'

import Box from '@mui/material/Box'
import { usePersistentState } from '@hooks/usePersistentState'
import { TOPBAR_HEIGHT } from '@constants/layout'
import AppRail from './AppRail'
import AppTopBar from './AppTopBar'
import Breadcrumbs from './Breadcrumbs'

export default function AppShell({ children }) {
  const [expanded, setExpanded] = usePersistentState('rail.expanded', false)

  return (
    <Box>
      <AppTopBar expanded={expanded} onToggleMenu={() => setExpanded((v) => !v)} />
      <Box sx={{ display: 'flex' }}>
        <AppRail expanded={expanded} />
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: `calc(100vh - ${TOPBAR_HEIGHT}px)`,
            p: { xs: 2, md: 4 },
          }}
        >
          <Breadcrumbs />
          {children}
        </Box>
      </Box>
    </Box>
  )
}
