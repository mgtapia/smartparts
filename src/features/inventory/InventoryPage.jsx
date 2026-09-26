'use client'

import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ToolbarSearch from '@components/common/ToolbarSearch'
import { makeMatcher } from '@libs/textSearch'
import ToolbarButton from '@components/common/ToolbarButton'
import { ErrorState } from '@components/common/AsyncState'
import { ListPageSkeleton } from '@components/common/Skeletons'
import { formatIsoDate } from '@libs/dates'
import InventoryDialog from './components/InventoryDialog'
import { useInventory } from './hooks/useInventory'

const COLUMNS = [
  {
    id: 'part',
    label: 'Repuesto',
    sortValue: ({ entry, part }) => part?.nameEs ?? entry.partId,
    render: ({ entry, part }) => part?.nameEs ?? entry.partId,
  },
  {
    id: 'code',
    label: 'Código',
    sortValue: ({ part }) => part?.code,
    width: 140,
    render: ({ part }) => (
      <Box component="span" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: 12 }}>
        {part?.code ?? '—'}
      </Box>
    ),
  },
  {
    id: 'location',
    label: 'Ubicación',
    sortValue: ({ entry }) => entry.location,
    width: 180,
    render: ({ entry }) => entry.location ?? '—',
  },
  {
    id: 'quantity',
    label: 'Cantidad',
    sortValue: ({ entry }) => entry.quantity,
    width: 90,
    align: 'right',
    render: ({ entry }) => entry.quantity.toLocaleString('es-CL'),
  },
  {
    id: 'updated',
    label: 'Actualizado',
    sortValue: ({ entry }) => entry.updatedAt,
    width: 110,
    render: ({ entry }) => (entry.updatedAt ? formatIsoDate(entry.updatedAt) : '—'),
  },
]

export default function InventoryPage() {
  const { rows, parts, loading, error, reload } = useInventory()
  const [search, setSearch] = useState('')
  // `true` = agregar; una fila = editar ese stock.
  const [dialog, setDialog] = useState(null)

  const usedPartIds = useMemo(() => new Set(rows.map(({ entry }) => entry.partId)), [rows])
  const filtered = useMemo(() => {
    const matches = makeMatcher(search)
    return rows.filter(({ part, entry }) =>
      matches([
        part?.nameEs ?? entry.partId,
        part?.nameEn,
        part?.code,
        entry.location,
        part?.categoryPath?.split('__')[0],
      ]),
    )
  }, [rows, search])

  if (loading) {
    return (
      <ContentWidth>
        <ListPageSkeleton />
      </ContentWidth>
    )
  }
  if (error) {
    return (
      <ContentWidth>
        <ErrorState />
      </ContentWidth>
    )
  }

  return (
    <ContentWidth>
      <PageHeader title="Inventario" />
      {dialog ? (
        <InventoryDialog
          row={dialog === true ? undefined : dialog}
          parts={parts}
          usedPartIds={usedPartIds}
          onSaved={reload}
          onClose={() => setDialog(null)}
        />
      ) : null}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
        <ToolbarSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, código o ubicación…"
        />
        <ToolbarButton label="Agregar stock" onClick={() => setDialog(true)} />
      </Box>
      <ListTable
        sortKey="inventory"
        columns={COLUMNS}
        rows={filtered}
        getRowKey={({ entry }) => entry.id}
        onRowClick={(row) => setDialog(row)}
        emptyText="Sin stock cargado todavía: agrega el primero con Agregar stock."
      />
    </ContentWidth>
  )
}
