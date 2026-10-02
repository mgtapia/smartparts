'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import SectionPanel from '@components/layout/SectionPanel'
import ListTable from '@components/common/ListTable'
import InfoNote from '@components/common/InfoNote'
import Pill from '@components/common/Pill'
import Toolbar from '@components/common/Toolbar'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import ToolbarButton from '@components/common/ToolbarButton'
import UncertainValue from '@components/common/UncertainValue'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { downloadCsv } from '@libs/csv'
import { formatClp } from '@features/trial/constants'
import { usePriceReview } from './hooks/usePriceReview'
import { CONTAINER_OPTIONS, OPTION_OPTIONS, RED_REASON } from './constants'

const red = (children) => (
  <UncertainValue verified={false} reason={RED_REASON}>
    {children}
  </UncertainValue>
)

const formatPct = (n) => (n == null ? '—' : `${Math.round(n * 1000) / 10} %`)
const clpCell = (n) => (n == null ? '—' : red(formatClp(n)))

const HEADER_NOTES = [
  'Costo puesto en Chile en tres escenarios: "combinado" es el reparto óptimo entre todos los proveedores a la vez (como Carga completa con "Varios proveedores"); "línea" es el proveedor más barato de cada repuesto por separado, sin compartir gastos de embarque; "probable" es todo comprado al proveedor que se elige abajo, nuestro proveedor principal real.',
  'El PVP y el margen se calculan sobre el costo "probable" — es el que de verdad pagaríamos. La fórmula es la misma de siempre (Ajustes); esta tabla no la cambia, solo la muestra al lado del costo para decidir a mano.',
  'Es un reporte: no guarda nada. Sirve para fijar un precio de venta que no dependa de qué proveedor tengamos hoy.',
]

export default function PriceReviewPage() {
  const [seaMode, setSeaMode] = useState(CONTAINER_OPTIONS[0].value)
  const [option, setOption] = useState(OPTION_OPTIONS[0].value)
  const [requestedSupplierId, setRequestedSupplierId] = useState(null)
  const { data, suppliers, probableSupplierId, loading, error } = usePriceReview(
    requestedSupplierId,
    seaMode,
    option,
  )

  if (loading) {
    return (
      <ContentWidth>
        <DetailPageSkeleton rows={6} />
      </ContentWidth>
    )
  }
  if (error) {
    return (
      <ContentWidth>
        <ErrorState message="No se pudo armar la tabla: falta el vehículo en sourcing o sus cotizaciones." />
      </ContentWidth>
    )
  }

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.alias || s.name }))

  if (!data) {
    return (
      <ContentWidth>
        <ErrorState message="Sin datos: falta elegir un proveedor principal o no hay repuestos en sourcing." />
      </ContentWidth>
    )
  }

  const columns = [
    { id: 'name', label: 'Repuesto', sortValue: (r) => r.name, render: (r) => r.name, width: 220 },
    { id: 'code', label: 'Código', width: 90, render: (r) => r.code ?? '—' },
    {
      id: 'costCombinedAir',
      label: 'Costo aéreo (combinado)',
      align: 'right',
      width: 140,
      sortValue: (r) => r.costCombinedAirClp,
      render: (r) => clpCell(r.costCombinedAirClp),
    },
    {
      id: 'costLineAir',
      label: 'Costo aéreo (línea)',
      align: 'right',
      width: 140,
      sortValue: (r) => r.costLineAirClp,
      render: (r) => clpCell(r.costLineAirClp),
    },
    {
      id: 'costProbableAir',
      label: 'Costo aéreo (probable)',
      align: 'right',
      width: 140,
      sortValue: (r) => r.costProbableAirClp,
      render: (r) => clpCell(r.costProbableAirClp),
    },
    {
      id: 'pvpAir',
      label: 'PVP aéreo',
      align: 'right',
      width: 120,
      sortValue: (r) => r.pvpAirClp,
      render: (r) => clpCell(r.pvpAirClp),
    },
    {
      id: 'marginAir',
      label: 'Margen aéreo',
      align: 'right',
      width: 100,
      sortValue: (r) => r.marginAirPct,
      render: (r) => formatPct(r.marginAirPct),
    },
    {
      id: 'costCombinedSea',
      label: 'Costo marítimo (combinado)',
      align: 'right',
      width: 150,
      sortValue: (r) => r.costCombinedSeaClp,
      render: (r) => clpCell(r.costCombinedSeaClp),
    },
    {
      id: 'costLineSea',
      label: 'Costo marítimo (línea)',
      align: 'right',
      width: 140,
      sortValue: (r) => r.costLineSeaClp,
      render: (r) => clpCell(r.costLineSeaClp),
    },
    {
      id: 'costProbableSea',
      label: 'Costo marítimo (probable)',
      align: 'right',
      width: 150,
      sortValue: (r) => r.costProbableSeaClp,
      render: (r) => clpCell(r.costProbableSeaClp),
    },
    {
      id: 'pvpSea',
      label: 'PVP marítimo',
      align: 'right',
      width: 120,
      sortValue: (r) => r.pvpSeaClp,
      render: (r) => clpCell(r.pvpSeaClp),
    },
    {
      id: 'marginSea',
      label: 'Margen marítimo',
      align: 'right',
      width: 110,
      sortValue: (r) => r.marginSeaPct,
      render: (r) => formatPct(r.marginSeaPct),
    },
    {
      id: 'seaVsAirCost',
      label: 'Marítimo vs. aéreo (costo)',
      align: 'right',
      width: 150,
      sortValue: (r) => r.seaVsAirCostPct,
      render: (r) => formatPct(r.seaVsAirCostPct),
    },
    {
      id: 'seaVsAirPvp',
      label: 'Marítimo vs. aéreo (PVP)',
      align: 'right',
      width: 150,
      sortValue: (r) => r.seaVsAirPvpPct,
      render: (r) => formatPct(r.seaVsAirPvpPct),
    },
    {
      id: 'flag',
      label: '',
      width: 50,
      render: (r) =>
        r.priceGap ? (
          <Tooltip title="El PVP es 5 veces o más el costo probable: revisar el precio de referencia.">
            <span>
              <Pill label="!" tone="warning" />
            </span>
          </Tooltip>
        ) : null,
    },
  ]

  const downloadReviewCsv = () => {
    downloadCsv(
      `precios-consolidados-${option}.csv`,
      [
        'Repuesto',
        'Código',
        'Costo aéreo (combinado)',
        'Costo aéreo (línea)',
        'Costo aéreo (probable)',
        'PVP aéreo',
        'Margen aéreo (%)',
        'Costo marítimo (combinado)',
        'Costo marítimo (línea)',
        'Costo marítimo (probable)',
        'PVP marítimo',
        'Margen marítimo (%)',
        'Marítimo vs. aéreo, costo (%)',
        'Marítimo vs. aéreo, PVP (%)',
        'Precio REF',
      ],
      data.rows.map((r) => [
        r.name,
        r.code ?? '',
        r.costCombinedAirClp ?? '',
        r.costLineAirClp ?? '',
        r.costProbableAirClp ?? '',
        r.pvpAirClp ?? '',
        r.marginAirPct != null ? Math.round(r.marginAirPct * 1000) / 10 : '',
        r.costCombinedSeaClp ?? '',
        r.costLineSeaClp ?? '',
        r.costProbableSeaClp ?? '',
        r.pvpSeaClp ?? '',
        r.marginSeaPct != null ? Math.round(r.marginSeaPct * 1000) / 10 : '',
        r.seaVsAirCostPct != null ? Math.round(r.seaVsAirCostPct * 1000) / 10 : '',
        r.seaVsAirPvpPct != null ? Math.round(r.seaVsAirPvpPct * 1000) / 10 : '',
        r.refClp ?? '',
      ]),
    )
  }

  return (
    <ContentWidth>
      <PageHeader
        title="Precios consolidados"
        actions={<InfoNote title="Cómo se arma" paragraphs={HEADER_NOTES} />}
      />

      <SectionPanel>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Toolbar>
            <ToolbarSelectBox
              label="Contenedor"
              value={seaMode}
              onChange={setSeaMode}
              options={CONTAINER_OPTIONS}
            />
            <ToolbarSelectBox
              label="Proveedor probable"
              value={probableSupplierId}
              onChange={setRequestedSupplierId}
              options={supplierOptions}
            />
            <ToolbarSelectBox
              label="Opción"
              value={option}
              onChange={setOption}
              options={OPTION_OPTIONS}
            />
            <ToolbarButton
              label="Descargar CSV"
              onClick={downloadReviewCsv}
              disabled={!data.rows.length}
            />
          </Toolbar>
          <ListTable
            sortKey="price-review"
            searchFields={(r) => [r.name, r.code]}
            searchPlaceholder="Buscar por repuesto o código…"
            columns={columns}
            rows={data.rows}
            getRowKey={(r) => r.partId}
            emptyText="Sin repuestos costeables."
          />
        </Box>
      </SectionPanel>
    </ContentWidth>
  )
}
