'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ToolbarSearch from '@components/common/ToolbarSearch'
import ToolbarButton from '@components/common/ToolbarButton'
import UncertainValue from '@components/common/UncertainValue'
import { ErrorState } from '@components/common/AsyncState'
import { ListPageSkeleton } from '@components/common/Skeletons'
import { formatIsoDate } from '@libs/dates'
import ClientDialog from './components/ClientDialog'
import { useClients } from './hooks/useClients'

const normalize = (s) => (s ?? '').toString().toLowerCase()

const COLUMNS = [
  { id: 'name', label: 'Cliente', render: ({ client }) => client.name },
  {
    id: 'rut',
    label: 'RUT',
    width: 130,
    render: ({ client }) =>
      client.rut ?? (
        <UncertainValue verified={false} reason="RUT sin registrar">
          Sin dato
        </UncertainValue>
      ),
  },
  {
    id: 'contact',
    label: 'Contacto',
    width: 180,
    render: ({ client }) => client.contact.person ?? client.contact.email ?? '—',
  },
  {
    id: 'orders',
    label: 'OC',
    width: 70,
    align: 'right',
    tooltip: 'OC recibidas del cliente, incluidas las anuladas.',
    render: ({ orders }) => orders.length,
  },
  {
    id: 'open',
    label: 'Vigentes',
    width: 80,
    align: 'right',
    tooltip: 'OC no anuladas.',
    render: ({ openCount }) => openCount,
  },
  {
    id: 'last',
    label: 'Última OC',
    width: 110,
    render: ({ lastDate }) => (lastDate ? formatIsoDate(lastDate) : '—'),
  },
]

export default function ClientsPage() {
  const router = useRouter()
  const { rows, loading, error, reload } = useClients()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const term = normalize(search.trim())

  const filtered = useMemo(
    () =>
      rows.filter(
        ({ client }) =>
          !term || normalize(client.name).includes(term) || normalize(client.rut).includes(term),
      ),
    [rows, term],
  )

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
      <PageHeader title="Clientes" meta={`${filtered.length} de ${rows.length} clientes.`} />
      {creating ? (
        <ClientDialog
          onClose={() => setCreating(false)}
          onSaved={async (id) => {
            await reload()
            router.push(`/clients/${id}`)
          }}
        />
      ) : null}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
        <ToolbarSearch value={search} onChange={setSearch} placeholder="Buscar por nombre o RUT…" />
        <ToolbarButton label="Nuevo cliente" onClick={() => setCreating(true)} />
      </Box>
      <ListTable
        columns={COLUMNS}
        rows={filtered}
        getRowKey={({ client }) => client.id}
        getRowHref={({ client }) => `/clients/${client.id}`}
        emptyText="Sin clientes todavía: crea el primero con Nuevo cliente."
      />
    </ContentWidth>
  )
}
