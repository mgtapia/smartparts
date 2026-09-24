import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Skeleton from '@mui/material/Skeleton'
import { RADIUS } from '@constants/colors'

const ROW_HEIGHT = 44 // mismo alto que las filas de ListTable y los controles de la barra
const TITLE_HEIGHT = 32
const TITLE_WIDTH = '24%'
const TOOLBAR_WIDTH = '100%'
const FIELD_LINE = 14
const FIELD_VALUE = 22

/** Encabezado de página: título y, opcionalmente, el conteo a la derecha. */
function HeaderSkeleton({ withMeta = true }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Skeleton variant="rounded" width={TITLE_WIDTH} height={TITLE_HEIGHT} />
      {withMeta ? <Skeleton variant="rounded" width="10%" height={FIELD_LINE + 4} /> : null}
    </Box>
  )
}

/** Filas de una lista tipo catálogo (`ListTable`). */
function RowsSkeleton({ rows }) {
  return (
    <Card sx={{ p: 0.75 }}>
      <Skeleton variant="rounded" height={FIELD_LINE} width="40%" sx={{ m: 1.5, mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={ROW_HEIGHT}
            sx={{ borderRadius: `${RADIUS.inputSmall}px` }}
          />
        ))}
      </Box>
    </Card>
  )
}

/**
 * Carga de una lista (catálogo, cotizaciones, proveedores): encabezado, barra
 * de herramientas y filas con la forma de la tabla real.
 */
export function ListPageSkeleton({ rows = 8 }) {
  return (
    <Box aria-busy="true" aria-label="Cargando">
      <HeaderSkeleton />
      <Skeleton
        variant="rounded"
        width={TOOLBAR_WIDTH}
        height={ROW_HEIGHT}
        sx={{ mb: 1.5, borderRadius: `${RADIUS.pill}px` }}
      />
      <RowsSkeleton rows={rows} />
    </Box>
  )
}

/**
 * Carga de una ficha (repuesto, proveedor, cotización): encabezado, tarjeta de
 * datos clave, pestañas y filas.
 */
export function DetailPageSkeleton({ rows = 4 }) {
  return (
    <Box aria-busy="true" aria-label="Cargando">
      <HeaderSkeleton />
      <Card sx={{ p: 2, mb: 1.5, display: 'flex', gap: 3 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <Box key={i} sx={{ flex: 1 }}>
            <Skeleton variant="rounded" width="50%" height={FIELD_LINE} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="80%" height={FIELD_VALUE} />
          </Box>
        ))}
      </Card>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            width={110}
            height={36}
            sx={{ borderRadius: `${RADIUS.pill}px` }}
          />
        ))}
      </Box>
      <RowsSkeleton rows={rows} />
    </Box>
  )
}
