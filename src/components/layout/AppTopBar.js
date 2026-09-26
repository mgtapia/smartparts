'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuth } from '@contexts/AuthContext'
import GlobalSearch from '@features/search/GlobalSearch'
import { TOPBAR_HEIGHT } from '@constants/layout'

/** Barra superior fija: hamburguesa del menú, logo, buscador global y usuario. */
export default function AppTopBar({ expanded, onToggleMenu }) {
  const { user, signOutUser } = useAuth()
  const [anchor, setAnchor] = useState(null)
  const name = user?.displayName || user?.email || ''

  return (
    <AppBar position="sticky" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar
        disableGutters
        sx={{ minHeight: TOPBAR_HEIGHT, height: TOPBAR_HEIGHT, gap: 2, px: 1.5 }}
      >
        <IconButton
          onClick={onToggleMenu}
          aria-label={expanded ? 'Contraer menú' : 'Expandir menú'}
          sx={{ color: 'common.white' }}
        >
          <MenuIcon />
        </IconButton>
        <Box
          component={Link}
          href="/"
          aria-label="SmartDeal"
          sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <Box
            component="img"
            src="/assets/brand/logo-smartdeal-white.svg"
            alt="SmartDeal"
            sx={{ height: 18, width: 'auto', display: 'block' }}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
          <GlobalSearch />
        </Box>
        {user ? (
          <>
            <IconButton
              onClick={(e) => setAnchor(e.currentTarget)}
              aria-label="Cuenta"
              aria-haspopup="menu"
              sx={{ p: 0.5 }}
            >
              <Avatar src={user.photoURL || undefined} alt={name} sx={{ width: 32, height: 32 }} />
            </IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
              <Box sx={{ px: 2, py: 1 }}>
                {user.displayName ? (
                  <Typography variant="body2">{user.displayName}</Typography>
                ) : null}
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
              <MenuItem
                onClick={() => {
                  setAnchor(null)
                  signOutUser()
                }}
              >
                Cerrar sesión
              </MenuItem>
            </Menu>
          </>
        ) : null}
      </Toolbar>
    </AppBar>
  )
}
