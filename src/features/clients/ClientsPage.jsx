'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ToolbarSearch from '@components/common/ToolbarSearch'
import { makeMatcher } from '@libs/textSearch'
import ToolbarButton from '@components/common/ToolbarButton'
import UncertainValue from '@components/common/UncertainValue'
import { ErrorState } from '@components/common/AsyncState'
import { ListPageSkeleton } from '@components/common/Skeletons'
import { formatIsoDate } from '@libs/dates'
import ClientDialog from './components/ClientDialog'
import { useClients } from './hooks/useClients'

const COLUMNS = [
  {
    id: 'name',
    label: 'Cliente',
    sortValue: ({ client }) => client.name,
    render: ({ client }) => client.name,
  },
  {
    id: 'rut',
    label: 'RUT',
    sortValue: ({ client }) => client.rut,
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
    sortValue: ({ client }) => client.contact.person ?? client.contact.email,
    width: 180,
    render: ({ client }) => client.contact.person ?? client.contact.email ?? '—',
  },
  {
    id: 'orders',
    label: 'OC',
    sortValue: ({ orders }) => orders.length,
    width: 70,
    align: 'right',
    tooltip: 'OC recibidas del cliente, incluidas las anuladas.',
    render: ({ orders }) => orders.length,
  },
  {
    id: 'open',
    label: 'Vigentes',
    sortValue: ({ openCount }) => openCount,
    width: 80,
    align: 'right',
    tooltip: 'OC no anuladas.',
    render: ({ openCount }) => openCount,
  },
  {
    id: 'last',
    label: 'Última OC',
    sortValue: ({ lastDate }) => lastDate,
    width: 110,
    render: ({ lastDate }) => (lastDate ? formatIsoDate(lastDate) : '—'),
  },
]

export default function ClientsPage() {
  const router = useRouter()
  const { rows, loading, error, reload } = useClients()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const matches = makeMatcher(search)
    return rows.filter(({ client }) =>
      matches([
        client.name,
        client.rut,
        client.contact?.person,
        client.contact?.email,
        client.contact?.phone,
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
      <PageHeader title="Clientes" />
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
        <ToolbarSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, RUT o contacto…"
        />
        <ToolbarButton label="Nuevo cliente" onClick={() => setCreating(true)} />
      </Box>
      <ListTable
        sortKey="clients"
        columns={COLUMNS}
        rows={filtered}
        getRowKey={({ client }) => client.id}
        getRowHref={({ client }) => `/clients/${client.id}`}
        emptyText="Sin clientes todavía: crea el primero con Nuevo cliente."
      />
    </ContentWidth>
  )
}
