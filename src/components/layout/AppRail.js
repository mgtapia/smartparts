'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@contexts/AuthContext'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import FactoryIcon from '@mui/icons-material/Factory'
import RequestQuoteIcon from '@mui/icons-material/RequestQuote'
import SearchIcon from '@mui/icons-material/Search'
import CalculateIcon from '@mui/icons-material/Calculate'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import GroupIcon from '@mui/icons-material/Group'
import SellIcon from '@mui/icons-material/Sell'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import TuneIcon from '@mui/icons-material/Tune'
import ChecklistIcon from '@mui/icons-material/Checklist'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { RAIL_ITEMS } from '@constants/routes'
import { RAIL_WIDTH } from '@constants/layout'

// Imports puntuales por ícono (nunca `import * as Icons`): un barrel import de
// @mui/icons-material obliga a webpack a procesar ~2500 módulos y dispara el
// build a varios minutos. Este mapa es lo único que hay que tocar al sumar un
// ítem al rail.
const ICONS = {
  Dashboard: DashboardIcon,
  DirectionsCar: DirectionsCarIcon,
  Category: Inventory2Icon,
  Factory: FactoryIcon,
  RequestQuote: RequestQuoteIcon,
  Search: SearchIcon,
  Calculate: CalculateIcon,
  LocalShipping: LocalShippingIcon,
  Group: GroupIcon,
  Sell: SellIcon,
  UploadFile: UploadFileIcon,
  Tune: TuneIcon,
  Checklist: ChecklistIcon,
  ReceiptLong: ReceiptLongIcon,
}

/**
 * Rail vertical de módulos — ver .agent/DESIGN.md §Navegación.
 * Solo se muestran los `implemented: true` en @constants/routes (el resto son
 * placeholders sin feature real, no forman parte de la navegación todavía).
 * `permission` filtra ítems según el rol del usuario (Fase 2, ver docs/SEGURIDAD-Y-ROLES.md);
 * hasta que Auth con custom claims esté conectado, se muestran todos los implementados.
 */
export default function AppRail() {
  const pathname = usePathname()
  const { user, signOutUser } = useAuth()

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
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {RAIL_ITEMS.filter((item) => item.implemented).map((item) => {
        const Icon = ICONS[item.icon]
        const active = [item.path, ...(item.alsoActiveOn ?? [])].some((p) =>
          pathname?.startsWith(p),
        )
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

      {user ? (
        <Tooltip title={`${user.displayName || user.email} — cerrar sesión`} placement="right">
          <Box
            component="button"
            onClick={() => signOutUser()}
            sx={{
              mt: 'auto',
              width: 36,
              height: 36,
              p: 0,
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              bgcolor: 'transparent',
            }}
          >
            <Avatar
              src={user.photoURL || undefined}
              alt={user.displayName || user.email || ''}
              sx={{ width: 36, height: 36 }}
            />
          </Box>
        </Tooltip>
      ) : null}
    </Box>
  )
}
