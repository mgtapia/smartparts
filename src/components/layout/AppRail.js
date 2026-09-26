'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Typography from '@mui/material/Typography'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useAuth } from '@contexts/AuthContext'
import { usePersistentState } from '@hooks/usePersistentState'
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
import FlightIcon from '@mui/icons-material/Flight'
import ChecklistIcon from '@mui/icons-material/Checklist'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { RAIL_ITEMS } from '@constants/routes'
import { RAIL_WIDTH, RAIL_WIDTH_EXPANDED } from '@constants/layout'

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
  Flight: FlightIcon,
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
  const [expanded, setExpanded] = usePersistentState('rail.expanded', false)

  return (
    <Box
      component="nav"
      sx={{
        width: expanded ? RAIL_WIDTH_EXPANDED : RAIL_WIDTH,
        flexShrink: 0,
        transition: 'width 150ms ease',
        overflow: 'hidden',
        bgcolor: 'brand.railBg',
        display: 'flex',
        flexDirection: 'column',
        alignItems: expanded ? 'stretch' : 'center',
        px: expanded ? 1.5 : 0,
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
          <Tooltip key={item.key} title={expanded ? '' : item.labelEs} placement="right">
            <Box
              component={Link}
              href={item.path}
              sx={{
                width: expanded ? 'auto' : 44,
                height: 44,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: expanded ? 'flex-start' : 'center',
                gap: 1.5,
                px: expanded ? 1.5 : 0,
                borderRadius: 2,
                color: active ? 'secondary.main' : 'rgba(255,255,255,0.65)',
                bgcolor: active ? 'rgba(197,255,62,0.12)' : 'transparent',
                textDecoration: 'none',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <Icon fontSize="small" />
              {expanded ? (
                <Typography variant="body2" noWrap sx={{ color: 'inherit' }}>
                  {item.labelEs}
                </Typography>
              ) : null}
            </Box>
          </Tooltip>
        )
      })}

      <Tooltip title={expanded ? '' : 'Expandir menú'} placement="right">
        <Box
          component="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Contraer menú' : 'Expandir menú'}
          sx={{
            mt: 'auto',
            width: expanded ? 'auto' : 44,
            height: 36,
            flexShrink: 0,
            alignSelf: expanded ? 'stretch' : 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: expanded ? 'flex-end' : 'center',
            px: expanded ? 1.5 : 0,
            border: 'none',
            borderRadius: 2,
            cursor: 'pointer',
            bgcolor: 'transparent',
            color: 'rgba(255,255,255,0.65)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
          }}
        >
          {expanded ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </Box>
      </Tooltip>

      {user ? (
        <Tooltip title={`${user.displayName || user.email} — cerrar sesión`} placement="right">
          <Box
            component="button"
            onClick={() => signOutUser()}
            sx={{
              mt: 0.5,
              alignSelf: expanded ? 'flex-start' : 'center',
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
