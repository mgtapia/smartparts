'use client'

import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { RADIUS } from '@constants/colors'

const MAIN_BASIS = 220 // px — la columna principal es la única que se estira

/**
 * Tabla de listas con el mismo diseño que el catálogo: encabezado en
 * `overline`, filas de 44 px sobre `brand.bodyBg`, texto a 13 px y sin
 * negritas y columnas de ancho base fijo salvo la primera (principal). Nunca
 * hace scroll horizontal ni pasa del ancho de la pantalla: si falta espacio,
 * las columnas se achican y el texto se corta con puntos suspensivos.
 *
 * Cada columna: `{ id, label, width?, align?, tooltip?, render(row) }`. La
 * primera sin `width` es la principal y se estira con lo que sobra. Una fila
 * con `getRowHref` se vuelve un link.
 *
 * @param {Object} props
 * @param {Array<{ id: string, label: string, width?: number, align?: 'left'|'right', tooltip?: string, render: (row: any) => import('react').ReactNode }>} props.columns
 * @param {any[]} props.rows
 * @param {(row: any) => string} props.getRowKey
 * @param {(row: any) => string} [props.getRowHref]
 * @param {string} [props.emptyText]
 */
export default function ListTable({
  columns,
  rows,
  getRowKey,
  getRowHref,
  emptyText = 'Sin resultados.',
}) {
  const cellSx = (c) => ({
    flex: c.width ? `0 1 ${c.width}px` : `1 1 ${MAIN_BASIS}px`,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: c.align === 'right' ? 'right' : 'left',
  })

  return (
    <Card sx={{ p: 0.75, overflow: 'hidden' }}>
      <Box>
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              height: 36,
              px: 1.5,
              mb: 0.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            {columns.map((c) => {
              const head = (
                <Typography
                  key={c.id}
                  variant="overline"
                  color="text.secondary"
                  sx={{ ...cellSx(c), lineHeight: 1, cursor: c.tooltip ? 'help' : undefined }}
                >
                  {c.label}
                </Typography>
              )
              return c.tooltip ? (
                <Tooltip key={c.id} title={c.tooltip}>
                  {head}
                </Tooltip>
              ) : (
                head
              )
            })}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                {emptyText}
              </Typography>
            ) : (
              rows.map((row) => {
                const href = getRowHref?.(row)
                return (
                  <Box
                    key={getRowKey(row)}
                    {...(href ? { component: Link, href } : {})}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      height: 44,
                      px: 1.5,
                      borderRadius: `${RADIUS.inputSmall}px`,
                      textDecoration: 'none',
                      color: 'inherit',
                      bgcolor: 'brand.bodyBg',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    {columns.map((c) => (
                      <Box key={c.id} sx={{ ...cellSx(c), fontSize: 13 }}>
                        {c.render(row)}
                      </Box>
                    ))}
                  </Box>
                )
              })
            )}
          </Box>
        </Box>
      </Box>
    </Card>
  )
}
