'use client'

import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ToolbarSearch from '@components/common/ToolbarSearch'
import UncertainValue from '@components/common/UncertainValue'
import { LoadingState, ErrorState } from '@components/common/AsyncState'
import { supplierLabel } from '@features/quotes/constants'
import { FACT_KEYS, factOf, factText } from './constants'
import { useSuppliers } from './hooks/useSuppliers'

const normalize = (s) => (s ?? '').toString().toLowerCase()

/** Un dato con fuente en una celda de lista: rojo si no está confirmado. */
function FactCell({ supplier, factKey }) {
  const fact = factOf(supplier, factKey)
  return (
    <UncertainValue verified={fact.confirmed} reason="Sin confirmar con una fuente">
      {factText(factKey, fact.value) ?? 'Sin dato'}
    </UncertainValue>
  )
}

const COLUMNS = [
  {
    id: 'supplier',
    label: 'Proveedor',
    render: ({ supplier }) => (
      <span title={supplier.name}>{supplierLabel(supplier, supplier.id)}</span>
    ),
  },
  {
    id: 'type',
    label: 'Tipo',
    width: 110,
    render: ({ supplier }) => <FactCell supplier={supplier} factKey="type" />,
  },
  {
    id: 'formF',
    label: 'Formulario F',
    width: 110,
    render: ({ supplier }) => <FactCell supplier={supplier} factKey="formF" />,
  },
  {
    id: 'quotes',
    label: 'Cotizaciones',
    width: 100,
    align: 'right',
    render: ({ quotations }) => quotations.length,
  },
  {
    id: 'parts',
    label: 'Repuestos',
    width: 90,
    align: 'right',
    tooltip: 'Repuestos distintos cotizados: una pieza con OEM y AFM cuenta una sola vez.',
    render: ({ partCount }) => partCount,
  },
  {
    id: 'pending',
    label: 'Por confirmar',
    width: 110,
    align: 'right',
    tooltip: 'Datos del proveedor sin confirmar con una fuente.',
    render: ({ unconfirmed }) => (
      <UncertainValue
        verified={unconfirmed === 0}
        reason="Datos del proveedor sin confirmar con una fuente"
      >
        {unconfirmed} de {FACT_KEYS.length}
      </UncertainValue>
    ),
  },
]

export default function SuppliersPage() {
  const { rows, loading, error } = useSuppliers()
  const [search, setSearch] = useState('')
  const term = normalize(search.trim())

  const filtered = useMemo(
    () =>
      rows.filter(
        ({ supplier }) =>
          !term ||
          normalize(supplier.name).includes(term) ||
          normalize(supplier.alias).includes(term),
      ),
    [rows, term],
  )

  if (loading) {
    return (
      <ContentWidth>
        <LoadingState />
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
      <PageHeader title="Proveedores" meta={`${filtered.length} de ${rows.length} proveedores.`} />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
        <ToolbarSearch value={search} onChange={setSearch} placeholder="Buscar por proveedor…" />
      </Box>
      <ListTable
        columns={COLUMNS}
        rows={filtered}
        getRowKey={({ supplier }) => supplier.id}
        getRowHref={({ supplier }) => `/suppliers/${supplier.id}`}
        emptyText="Sin proveedores cargados todavía."
      />
    </ContentWidth>
  )
}
