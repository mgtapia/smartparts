'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Typography from '@mui/material/Typography'
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
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import { visibleNavEntries, isNavItemActive, entryPath } from '@constants/routes'
import { RAIL_WIDTH, RAIL_WIDTH_EXPANDED } from '@constants/layout'

// Imports puntuales por ícono (nunca `import * as Icons`): un barrel import de
// @mui/icons-material obliga a webpack a procesar ~2500 módulos y dispara el
// build a varios minutos. Este mapa es lo único que hay que tocar al sumar un
// ítem al menú.
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
  ShoppingCart: ShoppingCartIcon,
}

const IDLE_COLOR = 'rgba(255,255,255,0.65)'
const HOVER_BG = 'rgba(255,255,255,0.08)'
const ACTIVE_BG = 'rgba(197,255,62,0.12)'

/** Fila del rail: una entrada del menú (un grupo lleva a su primer módulo). */
function rowSx({ expanded, active }) {
  return {
    width: expanded ? 'auto' : 44,
    height: 44,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: expanded ? 'flex-start' : 'center',
    gap: 1.5,
    px: expanded ? 1.5 : 0,
    border: 'none',
    borderRadius: 2,
    cursor: 'pointer',
    font: 'inherit',
    textAlign: 'left',
    color: active ? 'secondary.main' : IDLE_COLOR,
    bgcolor: active ? ACTIVE_BG : 'transparent',
    textDecoration: 'none',
    '&:hover': { bgcolor: HOVER_BG },
  }
}

function RailLink({ item, pathname, expanded }) {
  const Icon = ICONS[item.icon]
  const active = isNavItemActive(item, pathname)
  return (
    <Tooltip title={expanded ? '' : item.labelEs} placement="right">
      <Box
        component={Link}
        href={item.path}
        sx={rowSx({ expanded, active })}
        aria-current={active ? 'page' : undefined}
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
}

/**
 * Menú lateral — ver .agent/DESIGN.md §Navegación. `expanded` lo controla la
 * hamburguesa de la barra superior. Solo se muestran los `implemented: true`
 * de @constants/routes; `permission` filtra por rol cuando Auth con custom
 * claims esté conectado (Fase 2, ver docs/SEGURIDAD-Y-ROLES.md).
 */
export default function AppRail({ expanded }) {
  const pathname = usePathname()

  return (
    <Box
      component="nav"
      sx={{
        width: expanded ? RAIL_WIDTH_EXPANDED : RAIL_WIDTH,
        flexShrink: 0,
        transition: 'width 150ms ease',
        overflowX: 'hidden',
        overflowY: 'auto',
        bgcolor: 'brand.railBg',
        display: 'flex',
        flexDirection: 'column',
        alignItems: expanded ? 'stretch' : 'center',
        px: expanded ? 1.5 : 0,
        py: 2,
        gap: 0.5,
      }}
    >
      {visibleNavEntries().map((entry) => (
        <RailLink
          key={entry.key}
          item={{
            ...entry,
            path: entryPath(entry),
            alsoActiveOn: entry.children?.flatMap((c) => [c.path, ...(c.alsoActiveOn ?? [])]),
          }}
          pathname={pathname}
          expanded={expanded}
        />
      ))}
    </Box>
  )
}
