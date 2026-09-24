'use client'

import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ToolbarSearch from '@components/common/ToolbarSearch'
import UncertainValue from '@components/common/UncertainValue'
import { ErrorState } from '@components/common/AsyncState'
import { ListPageSkeleton } from '@components/common/Skeletons'
import { supplierLabel } from '@features/quotes/constants'
import { QUALITY } from '@features/dashboard/analyticsModel'
import { useAnalytics } from '@features/dashboard/hooks/useAnalytics'
import { formatBp } from '@libs/percent'
import { factOf, factText } from './constants'
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
    id: 'cheapest',
    label: 'Más barato',
    width: 100,
    align: 'right',
    tooltip:
      'Repuestos del Dongfeng E70 con oferta de dos o más proveedores donde este tiene el menor precio. Un empate suma a todos.',
    render: ({ stats }) => stats?.cheapest ?? '—',
  },
  {
    id: 'over',
    label: 'Sobrecosto',
    width: 100,
    align: 'right',
    tooltip:
      'Cuánto más caro es, en promedio, que el más barato de cada repuesto del Dongfeng E70 con dos o más ofertas. Compara precios en USD sin flete ni aranceles.',
    render: ({ stats }) => (stats?.overBp == null ? '—' : formatBp(stats.overBp)),
  },
  {
    id: 'oem',
    label: 'OEM',
    width: 70,
    align: 'right',
    tooltip: 'Repuestos del Dongfeng E70 que ofrece como OEM.',
    render: ({ stats }) => stats?.oem ?? '—',
  },
  {
    id: 'afm',
    label: 'AFM',
    width: 70,
    align: 'right',
    tooltip: 'Repuestos del Dongfeng E70 que ofrece como AFM.',
    render: ({ stats }) => stats?.afm ?? '—',
  },
]

export default function SuppliersPage() {
  const { rows: supplierRows, loading: suppliersLoading, error: suppliersError } = useSuppliers()
  const analytics = useAnalytics(QUALITY.ANY)
  const loading = suppliersLoading || analytics.loading
  const error = suppliersError || analytics.error
  const rows = useMemo(() => {
    const stats = new Map((analytics.data?.suppliers ?? []).map((s) => [s.id, s]))
    return supplierRows.map((r) => ({ ...r, stats: stats.get(r.supplier.id) ?? null }))
  }, [supplierRows, analytics.data])
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
