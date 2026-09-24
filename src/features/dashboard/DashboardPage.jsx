'use client'

import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import InfoNote from '@components/common/InfoNote'
import UncertainValue from '@components/common/UncertainValue'
import { MoneyFromMicros } from '@components/common/MoneyValue'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { GRID_GAP } from '@constants/layout'
import { formatBp } from '@libs/percent'
import { QUALITY } from './analyticsModel'
import { useAnalytics } from './hooks/useAnalytics'

const PRICE_NOTE = [
  'Precio unitario del proveedor llevado a USD, sin flete, aranceles ni gastos de origen. Si un proveedor ofrece varias variantes o tramos, se usa la más barata.',
  'Las cotizaciones inferidas del lado opuesto no son ofertas del proveedor y no cuentan.',
]

const SUPPLIER_COLUMNS = [
  { id: 'name', label: 'Proveedor', render: (s) => s.name },
  {
    id: 'parts',
    label: 'Cotizados',
    width: 100,
    align: 'right',
    tooltip: 'Repuestos con precio de este proveedor.',
    render: (s) => s.parts,
  },
  {
    id: 'cheapest',
    label: 'Más barato',
    width: 120,
    align: 'right',
    tooltip:
      'Repuestos con oferta de dos o más proveedores donde este tiene el menor precio. Un empate suma a todos.',
    render: (s) => s.cheapest,
  },
  {
    id: 'over',
    label: 'Sobrecosto',
    width: 130,
    align: 'right',
    tooltip:
      'Cuánto más caro es, en promedio, que el más barato de cada repuesto con dos o más ofertas.',
    render: (s) => (s.overBp === null ? '—' : formatBp(s.overBp)),
  },
  { id: 'oem', label: 'OEM', width: 70, align: 'right', render: (s) => s.oem },
  { id: 'afm', label: 'AFM', width: 70, align: 'right', render: (s) => s.afm },
]

export default function DashboardPage() {
  const { data, loading, error } = useAnalytics(QUALITY.ANY)

  if (loading) {
    return (
      <ContentWidth>
        <DetailPageSkeleton rows={6} />
      </ContentWidth>
    )
  }
  if (error || !data) {
    return (
      <ContentWidth>
        <ErrorState />
      </ContentWidth>
    )
  }

  const { summary, suppliers, afmVsOem, topGaps } = data
  const nameOf = (id) => suppliers.find((s) => s.id === id)?.name ?? id

  const gapColumns = [
    {
      id: 'part',
      label: 'Repuesto',
      render: (g) => (
        <Link href={`/parts/${g.part.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          {g.part.nameEs}
        </Link>
      ),
    },
    {
      id: 'cheapest',
      label: 'Más barato',
      width: 200,
      render: (g) => (
        <>
          {nameOf(g.cheapest.supplierId)}{' '}
          <MoneyFromMicros micros={g.cheapest.micro} currency="USD" />
        </>
      ),
    },
    {
      id: 'dearest',
      label: 'Más caro',
      width: 200,
      render: (g) => (
        <>
          {nameOf(g.dearest.supplierId)} <MoneyFromMicros micros={g.dearest.micro} currency="USD" />
        </>
      ),
    },
    {
      id: 'spread',
      label: 'Diferencia',
      width: 90,
      align: 'right',
      render: (g) => formatBp(g.spreadBp),
    },
  ]

  return (
    <ContentWidth>
      <PageHeader title="Dashboard" />

      <Card sx={{ p: 2, mb: `${GRID_GAP}px` }}>
        <InfoGrid columns={5}>
          <InfoField
            label="Cotizados"
            hint="Repuestos con al menos un precio, sobre el total del vehículo."
          >
            {summary.quotedParts} de {summary.totalParts}
          </InfoField>
          <InfoField label="Comparables" hint="Repuestos con precio de dos o más proveedores.">
            {summary.comparableParts}
          </InfoField>
          <InfoField
            label="Diferencia típica"
            hint="Mediana de cuánto más caro es el precio más alto que el más bajo, en los repuestos comparables."
          >
            {summary.medianSpreadBp === null ? 'Sin datos' : formatBp(summary.medianSpreadBp)}
          </InfoField>
          <InfoField
            label="AFM vs OEM"
            hint="Mediana de la diferencia de precio entre la versión AFM y la OEM del mismo repuesto y proveedor."
          >
            {afmVsOem.medianBp === null
              ? 'Sin datos'
              : `${afmVsOem.medianBp <= 0 ? '−' : '+'}${formatBp(Math.abs(afmVsOem.medianBp))}`}
          </InfoField>
          <InfoField
            label="Moneda confirmada"
            hint="Precios cuya moneda confirmó el proveedor. El resto se lleva a USD con el tipo de cambio de referencia."
          >
            <UncertainValue
              verified={summary.pricesUnconfirmedCurrency === 0}
              reason="Moneda sin confirmar por el proveedor"
            >
              {summary.pricesTotal - summary.pricesUnconfirmedCurrency} de {summary.pricesTotal}
            </UncertainValue>
          </InfoField>
        </InfoGrid>
      </Card>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}
      >
        Proveedores
        <InfoNote dense title="Cómo leer el dashboard" paragraphs={PRICE_NOTE} />
      </Typography>
      <Box sx={{ mb: `${GRID_GAP}px` }}>
        <ListTable
          columns={SUPPLIER_COLUMNS}
          rows={suppliers}
          getRowKey={(s) => s.id}
          getRowHref={(s) => `/suppliers/${s.id}`}
          emptyText="Ningún proveedor tiene precio."
        />
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Mayores diferencias entre proveedores
      </Typography>
      <ListTable
        columns={gapColumns}
        rows={topGaps}
        getRowKey={(g) => g.part.id}
        getRowHref={(g) => `/parts/${g.part.id}`}
        emptyText="Ningún repuesto tiene oferta de dos proveedores."
      />
    </ContentWidth>
  )
}
