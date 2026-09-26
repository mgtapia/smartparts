'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
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
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import { visibleNavEntries, isNavItemActive } from '@constants/routes'
import { RAIL_WIDTH, RAIL_WIDTH_EXPANDED, TOPBAR_HEIGHT } from '@constants/layout'

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

/** Fila del rail (ítem directo, hijo de un grupo o encabezado de grupo). */
function rowSx({ expanded, active, indent = false }) {
  return {
    width: expanded ? 'auto' : 44,
    height: 44,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: expanded ? 'flex-start' : 'center',
    gap: 1.5,
    pl: expanded ? (indent ? 4.5 : 1.5) : 0,
    pr: expanded ? 1.5 : 0,
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

function RailLink({ item, pathname, expanded, indent = false }) {
  const Icon = ICONS[item.icon]
  const active = isNavItemActive(item, pathname)
  return (
    <Tooltip title={expanded ? '' : item.labelEs} placement="right">
      <Box
        component={Link}
        href={item.path}
        sx={rowSx({ expanded, active, indent })}
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
 * Grupo del menú. Contraído: el ícono abre un flyout a la derecha con los ítems.
 * Expandido: se despliega en línea; el grupo con la ruta activa se ve abierto.
 */
function RailGroup({ entry, pathname, expanded, open, onToggle }) {
  const [anchor, setAnchor] = useState(null)
  const Icon = ICONS[entry.icon]
  const active = entry.children.some((c) => isNavItemActive(c, pathname))

  if (!expanded) {
    return (
      <>
        <Tooltip title={anchor ? '' : entry.labelEs} placement="right">
          <Box
            component="button"
            onClick={(e) => setAnchor(e.currentTarget)}
            aria-haspopup="menu"
            aria-label={entry.labelEs}
            sx={rowSx({ expanded, active })}
          >
            <Icon fontSize="small" />
          </Box>
        </Tooltip>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{ paper: { sx: { ml: 1, minWidth: 200 } } }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ px: 2, display: 'block' }}>
            {entry.labelEs}
          </Typography>
          {entry.children.map((item) => {
            const ItemIcon = ICONS[item.icon]
            return (
              <MenuItem
                key={item.key}
                component={Link}
                href={item.path}
                selected={isNavItemActive(item, pathname)}
                onClick={() => setAnchor(null)}
              >
                <ListItemIcon>
                  <ItemIcon fontSize="small" />
                </ListItemIcon>
                {item.labelEs}
              </MenuItem>
            )
          })}
        </Menu>
      </>
    )
  }

  const showChildren = open || active
  return (
    <>
      <Box
        component="button"
        onClick={onToggle}
        aria-expanded={showChildren}
        sx={{
          ...rowSx({ expanded, active: false }),
          color: active ? 'secondary.main' : IDLE_COLOR,
        }}
      >
        <Icon fontSize="small" />
        <Typography variant="body2" noWrap sx={{ color: 'inherit', flex: 1 }}>
          {entry.labelEs}
        </Typography>
        {showChildren ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
      </Box>
      {showChildren
        ? entry.children.map((item) => (
            <RailLink key={item.key} item={item} pathname={pathname} expanded indent />
          ))
        : null}
    </>
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
  const [openGroups, setOpenGroups] = usePersistentState('rail.groups', {})

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
        height: `calc(100vh - ${TOPBAR_HEIGHT}px)`,
        position: 'sticky',
        top: TOPBAR_HEIGHT,
      }}
    >
      {visibleNavEntries().map((entry) =>
        entry.children ? (
          <RailGroup
            key={entry.key}
            entry={entry}
            pathname={pathname}
            expanded={expanded}
            open={Boolean(openGroups[entry.key])}
            onToggle={() => setOpenGroups((prev) => ({ ...prev, [entry.key]: !prev[entry.key] }))}
          />
        ) : (
          <RailLink key={entry.key} item={entry} pathname={pathname} expanded={expanded} />
        ),
      )}
    </Box>
  )
}
