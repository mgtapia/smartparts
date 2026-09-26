'use client'

import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import SectionTitle from '@components/common/SectionTitle'
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
import PendingSummary from './components/PendingSummary'
import ClientOrderSavings from './components/ClientOrderSavings'
import TrialSummary from './components/TrialSummary'
import ImportabilityFields from './components/ImportabilityFields'

const PRICE_NOTE = [
  'Precio unitario del proveedor llevado a USD, sin flete, aranceles ni gastos de origen. Si un proveedor ofrece varias variantes o tramos, se usa la más barata.',
  'Las cotizaciones inferidas del lado opuesto no son ofertas del proveedor y no cuentan.',
]

export default function OverviewPage() {
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
      <PageHeader title="Vista general" />

      <Card sx={{ p: 2, mb: `${GRID_GAP}px` }}>
        <InfoGrid columns={5}>
          <InfoField
            label="Cotizados"
            hint="Repuestos con al menos un precio, sobre el total del vehículo."
          >
            {summary.quotedParts} de {summary.totalParts}
          </InfoField>
          <InfoField
            label="Sin comparar"
            hint="Repuestos con precio de un solo proveedor: falta una segunda cotización para comparar."
          >
            {summary.quotedParts - summary.comparableParts}
          </InfoField>
          <InfoField
            label="AFM vs OEM"
            hint="Mediana de la diferencia de precio entre la versión AFM y la OEM del mismo repuesto y proveedor."
          >
            {afmVsOem.medianBp === null
              ? 'Sin datos'
              : `${afmVsOem.medianBp <= 0 ? '−' : '+'}${formatBp(Math.abs(afmVsOem.medianBp))}`}
          </InfoField>
          <ImportabilityFields />
        </InfoGrid>
      </Card>

      <TrialSummary />
      <ClientOrderSavings />
      <PendingSummary />

      <SectionTitle
        title="Mayores diferencias entre proveedores"
        description="Repuestos con más distancia entre el precio más barato y el más caro."
      />
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
