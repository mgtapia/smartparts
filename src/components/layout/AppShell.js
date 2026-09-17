import Box from '@mui/material/Box'
import AppRail from './AppRail'

export default function AppShell({ children }) {
  return (
    <Box sx={{ display: 'flex' }}>
      <AppRail />
      <Box component="main" sx={{ flex: 1, minHeight: '100vh', p: { xs: 2, md: 4 } }}>
        {children}
      </Box>
    </Box>
  )
}
