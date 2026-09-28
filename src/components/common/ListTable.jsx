'use client'

import { useContext, useMemo, useState } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ToolbarSearch from '@components/common/ToolbarSearch'
import { PanelContext } from '@components/layout/SectionPanel'
import { usePersistentState } from '@hooks/usePersistentState'
import { makeMatcher } from '@libs/textSearch'
import { nextSort, sortRows } from '@libs/sortRows'

const MAIN_BASIS = 220 // px — la columna principal es la única que se estira

/**
 * Tabla de listas con el mismo diseño que el catálogo: encabezado en
 * `overline`, filas de 44 px transparentes (oscurecen solo al pasar el mouse), texto a 13 px y sin
 * negritas y columnas de ancho base fijo salvo la primera (principal). Nunca
 * hace scroll horizontal ni pasa del ancho de la pantalla: si falta espacio,
 * las columnas se achican y el texto se corta con puntos suspensivos.
 *
 * Cada columna: `{ id, label, width?, align?, tooltip?, sortValue?, render(row) }`. La
 * primera sin `width` es la principal y se estira con lo que sobra. Una fila
 * con `getRowHref` se vuelve un link.
 *
 * @param {Object} props
 * @param {Array<{ id: string, label: string, width?: number, align?: 'left'|'right', tooltip?: string, render: (row: any) => import('react').ReactNode }>} props.columns
 * @param {any[]} props.rows
 * @param {(row: any) => string} props.getRowKey
 * @param {(row: any) => string} [props.getRowHref]
 * @param {(row: any) => void} [props.onRowClick]  La fila es clicable (ej. elegir un escenario).
 * @param {string} [props.selectedKey]  Clave de la fila elegida, resaltada.
 * Orden: una columna con `sortValue(row)` se ordena con un clic en su encabezado (ascendente,
 * descendente y sin orden). `defaultSort` es el orden inicial; con `sortKey` la elección se
 * recuerda en el navegador.
 *
 * Búsqueda: con `searchFields(row)` (lista de textos de la fila) la tabla trae su propio buscador,
 * con las mismas reglas que el resto de la app (sin tildes, todas las palabras, códigos sin guiones).
 *
 * @param {Object} props.columns  (ver arriba)
 * @param {{ id: string, dir: 'asc'|'desc' }} [props.defaultSort]
 * @param {string} [props.sortKey]
 * @param {(row: any) => Array<string|null|undefined>} [props.searchFields]
 * @param {string} [props.searchPlaceholder]
 * @param {string} [props.emptyText]
 */
export default function ListTable({
  columns,
  rows,
  getRowKey,
  getRowHref,
  onRowClick,
  selectedKey,
  defaultSort,
  sortKey,
  searchFields,
  searchPlaceholder = 'Buscar…',
  emptyText = 'Sin resultados.',
}) {
  const inPanel = useContext(PanelContext)
  const persistedSort = usePersistentState(`table.sort.${sortKey ?? 'off'}`, null)
  const localSort = useState(null)
  const [sort, setSort] = sortKey ? persistedSort : localSort
  const [query, setQuery] = useState('')
  const activeSort = sort ?? defaultSort ?? null

  const visible = useMemo(() => {
    let out = rows
    if (searchFields && query.trim()) {
      const matches = makeMatcher(query)
      out = out.filter((row) => matches(searchFields(row)))
    }
    const column = columns.find((c) => c.id === activeSort?.id)
    return column?.sortValue ? sortRows(out, column.sortValue, activeSort.dir) : out
    // `searchFields` y `columns` se arman en cada render de la pantalla: dependen de las filas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, activeSort?.id, activeSort?.dir])

  const cellSx = (c) => ({
    flex: c.width ? `0 1 ${c.width}px` : `1 1 ${MAIN_BASIS}px`,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: c.align === 'right' ? 'right' : 'left',
  })

  const Wrapper = inPanel ? Box : Card
  const table = (
    <Wrapper
      {...(inPanel ? { sx: { overflow: 'hidden' } } : { sx: { p: 0.75, overflow: 'hidden' } })}
    >
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
              const sortable = Boolean(c.sortValue)
              const sorted = activeSort?.id === c.id ? activeSort.dir : null
              const Arrow = sorted === 'desc' ? ArrowDownwardIcon : ArrowUpwardIcon
              const head = (
                <Typography
                  key={c.id}
                  variant="overline"
                  color={sorted ? 'text.primary' : 'text.secondary'}
                  {...(sortable
                    ? {
                        role: 'button',
                        tabIndex: 0,
                        'aria-sort': { asc: 'ascending', desc: 'descending' }[sorted] ?? 'none',
                        onClick: () => setSort(nextSort(activeSort, c.id)),
                        onKeyDown: (e) => e.key === 'Enter' && setSort(nextSort(activeSort, c.id)),
                      }
                    : {})}
                  sx={{
                    ...cellSx(c),
                    lineHeight: 1,
                    cursor: sortable ? 'pointer' : c.tooltip ? 'help' : undefined,
                    userSelect: 'none',
                    '&:hover': sortable ? { color: 'text.primary' } : undefined,
                  }}
                >
                  {c.label}
                  {sorted ? (
                    <Arrow sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'text-bottom' }} />
                  ) : null}
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
            {visible.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                {emptyText}
              </Typography>
            ) : (
              visible.map((row) => {
                const href = getRowHref?.(row)
                return (
                  <Box
                    key={getRowKey(row)}
                    {...(href ? { component: Link, href } : {})}
                    {...(onRowClick
                      ? {
                          role: 'button',
                          tabIndex: 0,
                          onClick: () => onRowClick(row),
                          onKeyDown: (e) => e.key === 'Enter' && onRowClick(row),
                        }
                      : {})}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      height: 44,
                      px: 1.5,
                      textDecoration: 'none',
                      color: 'inherit',
                      bgcolor: getRowKey(row) === selectedKey ? 'action.selected' : 'transparent',
                      cursor: onRowClick ? 'pointer' : undefined,
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
    </Wrapper>
  )

  if (!searchFields) return table
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex' }}>
        <ToolbarSearch value={query} onChange={setQuery} placeholder={searchPlaceholder} />
      </Box>
      {table}
    </Box>
  )
}
