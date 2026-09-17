'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import CategoryIcon from '@mui/icons-material/Category'
import SettingsIcon from '@mui/icons-material/Settings'
import FactoryIcon from '@mui/icons-material/Factory'
import RequestQuoteIcon from '@mui/icons-material/RequestQuote'
import SearchIcon from '@mui/icons-material/Search'
import CalculateIcon from '@mui/icons-material/Calculate'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import GroupIcon from '@mui/icons-material/Group'
import SellIcon from '@mui/icons-material/Sell'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import TuneIcon from '@mui/icons-material/Tune'
import { RAIL_ITEMS } from '@constants/routes'
import { RAIL_WIDTH } from '@constants/layout'

// Imports puntuales por ícono (nunca `import * as Icons`): un barrel import de
// @mui/icons-material obliga a webpack a procesar ~2500 módulos y dispara el
// build a varios minutos. Este mapa es lo único que hay que tocar al sumar un
// ítem al rail.
const ICONS = {
  Dashboard: DashboardIcon,
  DirectionsCar: DirectionsCarIcon,
  Category: CategoryIcon,
  Settings: SettingsIcon,
  Factory: FactoryIcon,
  RequestQuote: RequestQuoteIcon,
  Search: SearchIcon,
  Calculate: CalculateIcon,
  LocalShipping: LocalShippingIcon,
  Group: GroupIcon,
  Sell: SellIcon,
  UploadFile: UploadFileIcon,
  Tune: TuneIcon,
}

/**
 * Rail vertical de 13 módulos planos — ver .agent/DESIGN.md §Navegación.
 * `permission` filtra ítems según el rol del usuario (Fase 2, ver docs/SEGURIDAD-Y-ROLES.md);
 * en Fase 0/1 (sin Auth real) se muestran todos.
 */
export default function AppRail() {
  const pathname = usePathname()

  return (
    <Box
      component="nav"
      sx={{
        width: RAIL_WIDTH,
        flexShrink: 0,
        bgcolor: 'brand.railBg',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 2,
        gap: 0.5,
        minHeight: '100vh',
      }}
    >
      {RAIL_ITEMS.map((item) => {
        const Icon = ICONS[item.icon]
        const active = pathname?.startsWith(item.path)
        return (
          <Tooltip key={item.key} title={item.labelEs} placement="right">
            <Box
              component={Link}
              href={item.path}
              sx={{
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                color: active ? 'secondary.main' : 'rgba(255,255,255,0.65)',
                bgcolor: active ? 'rgba(197,255,62,0.12)' : 'transparent',
                textDecoration: 'none',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <Icon fontSize="small" />
            </Box>
          </Tooltip>
        )
      })}
    </Box>
  )
}
