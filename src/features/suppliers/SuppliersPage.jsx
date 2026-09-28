'use client'

import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import SectionPanel from '@components/layout/SectionPanel'
import ListTable from '@components/common/ListTable'
import ToolbarSearch from '@components/common/ToolbarSearch'
import { ErrorState } from '@components/common/AsyncState'
import { ListPageSkeleton } from '@components/common/Skeletons'
import { supplierLabel } from '@features/quotes/constants'
import { QUALITY } from '@features/overview/analyticsModel'
import { useAnalytics } from '@features/overview/hooks/useAnalytics'
import { formatBp } from '@libs/percent'
import { makeMatcher } from '@libs/textSearch'
import { SUPPLIER_TYPE_LABELS_ES } from '@constants/enums'
import FactCell from './components/FactCell'
import { useSuppliers } from './hooks/useSuppliers'

const COLUMNS = [
  {
    id: 'supplier',
    label: 'Proveedor',
    sortValue: ({ supplier }) => supplierLabel(supplier, supplier.id),
    render: ({ supplier }) => (
      <span title={supplier.name}>{supplierLabel(supplier, supplier.id)}</span>
    ),
  },
  {
    id: 'type',
    label: 'Tipo',
    sortValue: ({ supplier }) => supplier.facts?.type?.value,
    width: 110,
    render: ({ supplier }) => <FactCell supplier={supplier} factKey="type" />,
  },
  {
    id: 'formF',
    label: 'Formulario F',
    sortValue: ({ supplier }) => supplier.facts?.formF?.value,
    width: 110,
    render: ({ supplier }) => <FactCell supplier={supplier} factKey="formF" />,
  },
  {
    id: 'parts',
    label: 'Repuestos',
    sortValue: ({ partCount }) => partCount,
    width: 90,
    align: 'right',
    tooltip: 'Repuestos distintos cotizados: una pieza con OEM y AFM cuenta una sola vez.',
    render: ({ partCount }) => partCount,
  },
  {
    id: 'cheapest',
    label: 'Más barato',
    sortValue: ({ stats }) => stats?.cheapest,
    width: 100,
    align: 'right',
    tooltip:
      'Repuestos del Dongfeng E70 con oferta de dos o más proveedores donde este tiene el menor precio. Un empate suma a todos.',
    render: ({ stats }) => stats?.cheapest ?? '—',
  },
  {
    id: 'over',
    label: 'Sobrecosto',
    sortValue: ({ stats }) => stats?.overBp,
    width: 100,
    align: 'right',
    tooltip:
      'Cuánto más caro es, en promedio, que el más barato de cada repuesto del Dongfeng E70 con dos o más ofertas. Compara precios en USD sin flete ni aranceles.',
    render: ({ stats }) => (stats?.overBp == null ? '—' : formatBp(stats.overBp)),
  },
  {
    id: 'oem',
    label: 'OEM',
    sortValue: ({ stats }) => stats?.oem,
    width: 70,
    align: 'right',
    tooltip: 'Repuestos del Dongfeng E70 que ofrece como OEM.',
    render: ({ stats }) => stats?.oem ?? '—',
  },
  {
    id: 'afm',
    label: 'AFM',
    sortValue: ({ stats }) => stats?.afm,
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

  const filtered = useMemo(() => {
    const matches = makeMatcher(search)
    return rows.filter(({ supplier }) =>
      matches([
        supplier.alias,
        supplier.name,
        SUPPLIER_TYPE_LABELS_ES[supplier.facts?.type?.value],
        supplier.facts?.formF?.value === 'yes' ? 'formulario f' : null,
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
      <PageHeader title="Proveedores" />
      <SectionPanel>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
          <ToolbarSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar por proveedor, alias o tipo…"
          />
        </Box>
        <ListTable
          sortKey="suppliers"
          columns={COLUMNS}
          rows={filtered}
          getRowKey={({ supplier }) => supplier.id}
          getRowHref={({ supplier }) => `/suppliers/${supplier.id}`}
          emptyText="Sin proveedores cargados todavía."
        />
      </SectionPanel>
    </ContentWidth>
  )
}
