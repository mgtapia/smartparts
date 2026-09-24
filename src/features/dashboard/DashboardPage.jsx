'use client'

import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import { BarChart } from '@mui/x-charts/BarChart'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ChartCard from '@components/common/ChartCard'
import InfoNote from '@components/common/InfoNote'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import UncertainValue from '@components/common/UncertainValue'
import { MoneyFromMicros } from '@components/common/MoneyValue'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { CHART_HEIGHT, GRID_GAP } from '@constants/layout'
import { useUrlTab } from '@hooks/useUrlTab'
import { formatBp } from '@libs/percent'
import { QUALITY_OPTIONS } from '@features/quotes/partMatrix'
import { QUALITY } from './analyticsModel'
import { useAnalytics } from './hooks/useAnalytics'

const MICROS_PER_USD = 1_000_000
const CATEGORY_LABEL_WIDTH = 150 // px reservados a la izquierda para los nombres de categoría
const PRICE_NOTE = [
  'Precio unitario del proveedor llevado a USD, sin flete, aranceles ni gastos de origen. Si un proveedor ofrece varias variantes o tramos, se usa la más barata de la calidad elegida.',
  'Las cotizaciones inferidas del lado opuesto no son ofertas del proveedor y no cuentan.',
]

const usd = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'USD' })

/** Colores de las series desde el tema, no hex sueltos. */
function useSeriesColors() {
  const { vars, palette } = useTheme()
  const p = vars?.palette ?? palette
  return { main: p.primary.main, soft: p.info.main, missing: p.error.main }
}

const axisLabels = (items) => ({ scaleType: 'band', data: items.map((i) => i.name) })

export default function DashboardPage() {
  const [quality, setQuality] = useUrlTab([QUALITY.ANY, QUALITY.OEM, QUALITY.AFM], 'calidad')
  const { data, loading, error } = useAnalytics(quality)
  const colors = useSeriesColors()

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

  const { summary, suppliers, basket, qualityBySupplier, afmVsOem, categories, topGaps } = data
  const nameOf = (id) => suppliers.find((s) => s.id === id)?.name ?? id
  const chartBase = { height: CHART_HEIGHT, margin: { left: 8, right: 8, top: 24, bottom: 8 } }

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

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
        <ToolbarSelectBox
          label="Calidad"
          value={quality}
          onChange={setQuality}
          options={QUALITY_OPTIONS}
        />
        <InfoNote title="Cómo leer el dashboard" paragraphs={PRICE_NOTE} />
      </Box>

      <Card sx={{ p: 2, mb: `${GRID_GAP}px` }}>
        <InfoGrid columns={4}>
          <InfoField label="Repuestos cotizados">
            {summary.quotedParts} de {summary.totalParts}
          </InfoField>
          <InfoField label="Con 2 o más ofertas">{summary.comparableParts}</InfoField>
          <InfoField label="Diferencia típica entre ofertas">
            {summary.medianSpreadBp === null ? 'Sin datos' : formatBp(summary.medianSpreadBp)}
          </InfoField>
          <InfoField label="Precios con moneda confirmada">
            <UncertainValue
              verified={summary.pricesUnconfirmedCurrency === 0}
              reason="Los precios sin moneda confirmada se llevan a USD con el tipo de cambio de referencia"
            >
              {summary.pricesTotal - summary.pricesUnconfirmedCurrency} de {summary.pricesTotal}
            </UncertainValue>
          </InfoField>
        </InfoGrid>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: `${GRID_GAP}px`,
          mb: `${GRID_GAP}px`,
        }}
      >
        <ChartCard
          title="Repuestos donde es el más barato"
          note={[
            'Solo cuentan los repuestos con oferta de dos o más proveedores. Un empate suma a todos.',
          ]}
          empty={summary.comparableParts === 0}
          emptyText="Ningún repuesto tiene oferta de dos proveedores."
        >
          <BarChart
            {...chartBase}
            xAxis={[axisLabels(suppliers)]}
            series={[{ data: suppliers.map((s) => s.cheapest), color: colors.main }]}
            barLabel="value"
            slotProps={{ legend: { hidden: true } }}
          />
        </ChartCard>

        <ChartCard
          title="Sobrecosto medio frente al más barato"
          note={[
            'Por cada repuesto con dos o más ofertas, cuánto más caro es este proveedor que el más barato. Cero es que siempre es el más barato.',
          ]}
          empty={summary.comparableParts === 0}
          emptyText="Ningún repuesto tiene oferta de dos proveedores."
        >
          <BarChart
            {...chartBase}
            xAxis={[axisLabels(suppliers)]}
            series={[
              {
                data: suppliers.map((s) => (s.overBp ?? 0) / 100),
                color: colors.main,
                valueFormatter: (v) => formatBp(Math.round(v * 100)),
              },
            ]}
            slotProps={{ legend: { hidden: true } }}
          />
        </ChartCard>

        <ChartCard
          title="Repuestos ofrecidos por calidad"
          note={[
            'Repuestos distintos que cada proveedor ofrece como OEM y como AFM, sin importar la calidad elegida arriba.',
          ]}
          empty={qualityBySupplier.length === 0}
        >
          <BarChart
            {...chartBase}
            xAxis={[axisLabels(qualityBySupplier)]}
            series={[
              {
                data: qualityBySupplier.map((s) => s.oem),
                label: 'OEM',
                stack: 'q',
                color: colors.main,
              },
              {
                data: qualityBySupplier.map((s) => s.afm),
                label: 'AFM',
                stack: 'q',
                color: colors.soft,
              },
            ]}
          />
          {afmVsOem.medianBp !== null ? (
            <Typography color="text.secondary" sx={{ fontSize: 13, mt: 1 }}>
              En {afmVsOem.pairs} repuestos con ambas calidades del mismo proveedor, AFM cuesta{' '}
              {formatBp(Math.abs(afmVsOem.medianBp))} {afmVsOem.medianBp <= 0 ? 'menos' : 'más'} que
              OEM, valor típico.
            </Typography>
          ) : null}
        </ChartCard>

        <ChartCard
          title={`Canasta común: ${basket.parts} repuestos`}
          note={[
            'Suma del precio de los repuestos que cotizaron todos los proveedores, para compararlos sobre lo mismo.',
          ]}
          empty={basket.items.length === 0}
          emptyText="Ningún repuesto lo cotizaron todos los proveedores."
        >
          <BarChart
            {...chartBase}
            xAxis={[axisLabels(basket.items)]}
            series={[
              {
                data: basket.items.map((i) => i.totalMicro / MICROS_PER_USD),
                color: colors.main,
                valueFormatter: (v) => usd.format(v),
              },
            ]}
            slotProps={{ legend: { hidden: true } }}
          />
        </ChartCard>

        <Box sx={{ gridColumn: { md: '1 / -1' }, minWidth: 0 }}>
          <ChartCard title="Cobertura por categoría" empty={categories.length === 0}>
            <BarChart
              layout="horizontal"
              height={Math.max(CHART_HEIGHT, categories.length * 36)}
              margin={{ left: CATEGORY_LABEL_WIDTH, right: 8, top: 8, bottom: 8 }}
              yAxis={[{ scaleType: 'band', data: categories.map((c) => c.label) }]}
              series={[
                {
                  data: categories.map((c) => c.quoted),
                  label: 'Cotizados',
                  stack: 'c',
                  color: colors.main,
                },
                {
                  data: categories.map((c) => c.total - c.quoted),
                  label: 'Sin cotizar',
                  stack: 'c',
                  color: colors.missing,
                },
              ]}
            />
          </ChartCard>
        </Box>
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
