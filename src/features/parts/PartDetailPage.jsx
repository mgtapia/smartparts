'use client'

import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ViewTabs from '@components/common/ViewTabs'
import MoneyValue, { MoneyFromMicros } from '@components/common/MoneyValue'
import UncertainValue from '@components/common/UncertainValue'
import SourcedValueDialog from '@components/common/SourcedValueDialog'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import {
  CONFIRMED_LOGISTICS_STATUSES,
  LOGISTICS_STATUS_LABELS_ES,
  PART_TYPE,
} from '@constants/enums'
import { PART_IMAGE_SIZE } from '@constants/layout'
import { getPartImage, updatePartCustoms } from '@libs/repos/partsRepo'
import { useCostAssumptions } from '@features/quotes/hooks/useCostAssumptions'
import {
  costLine,
  priceUsdMicro,
  quotationId,
  unitPriceMoney,
} from '@features/quotes/hooks/useQuotations'
import { shortReason } from '@features/quotes/partMatrix'
import { supplierLabel } from '@features/quotes/constants'
import { useUrlTab } from '@hooks/useUrlTab'
import { usePartDetail } from './hooks/usePartDetail'
import CodeDialog from './components/CodeDialog'
import ImageDialog from './components/ImageDialog'
import LogisticsDialog from './components/LogisticsDialog'
import NamesDialog from './components/NamesDialog'
import { PART_TABS, TAB_LIST } from './constants'

const EDIT = {
  CODE: 'code',
  NAMES: 'names',
  LOGISTICS: 'logistics',
  CUSTOMS: 'customs',
  IMAGE: 'image',
}
const QUALITY_LABEL = { [PART_TYPE.ORIGINAL]: 'OEM', [PART_TYPE.ALTERNATIVE]: 'AFM' }

const formatKg = (g) => `${(g / 1000).toLocaleString('es-CL')} kg`
const formatLiters = (cm3) => `${(cm3 / 1000).toLocaleString('es-CL')} L`

export default function PartDetailPage({ partId }) {
  const { part, loading, error, refetch } = usePartDetail(partId)
  const assumptions = useCostAssumptions()
  const { mode, rates, settingsFor } = assumptions
  const [tab, setTab] = useUrlTab(Object.values(PART_TABS))
  const [editing, setEditing] = useState(null)
  const [image, setImage] = useState(null)
  const [imageKey, setImageKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getPartImage(partId)
      .then((img) => !cancelled && setImage(img))
      .catch(() => !cancelled && setImage(null))
    return () => {
      cancelled = true
    }
  }, [partId, imageKey])

  // Una fila por cotización con su costo final unitario, ordenadas por precio en USD.
  const rows = useMemo(() => {
    if (!part) return []
    return part.quotes
      .map((quote) => ({
        quote,
        cost: costLine({ part, quote }, { mode, rates, settingsFor }),
        priceMicro: priceUsdMicro(quote),
      }))
      .sort((a, b) => (a.priceMicro ?? Infinity) - (b.priceMicro ?? Infinity))
  }, [part, mode, rates, settingsFor])

  if (loading) {
    return (
      <ContentWidth>
        <DetailPageSkeleton />
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
  if (!part) {
    return (
      <ContentWidth>
        <PageHeader back={{ href: '/catalog', label: 'Catálogo' }} title="Repuesto no encontrado" />
      </ContentWidth>
    )
  }

  const closeEditor = () => setEditing(null)
  const saved = () => refetch()
  const logisticsConfirmed = CONFIRMED_LOGISTICS_STATUSES.includes(part.logisticsStatus)
  const logisticsReason = `${LOGISTICS_STATUS_LABELS_ES[part.logisticsStatus]}: falta confirmarlo con el proveedor o medirlo`

  const bestCost = (type) => {
    const ofType = rows.filter((r) => r.quote.partType === type)
    if (ofType.length === 0)
      return { text: 'Sin cotización', reason: 'Ningún proveedor cotizó esta calidad' }
    const priced = ofType.filter((r) => r.cost.landedNetUsdMicro !== null)
    if (priced.length === 0) {
      return { text: 'Falta dato', reason: ofType[0].cost.blockers.join('; ') }
    }
    const best = priced.reduce((a, b) =>
      b.cost.landedNetUsdMicro < a.cost.landedNetUsdMicro ? b : a,
    )
    return {
      micro: best.cost.landedNetUsdMicro,
      reason: `${supplierLabel(best.quote.supplier, best.quote.supplierId)}. Costo estimado, sin verificar`,
    }
  }

  const bestCostField = (type, label) => {
    const b = bestCost(type)
    return (
      <InfoField label={label}>
        <UncertainValue verified={false} reason={b.reason}>
          {b.micro === undefined ? b.text : <MoneyFromMicros micros={b.micro} currency="USD" />}
        </UncertainValue>
      </InfoField>
    )
  }

  const quoteColumns = [
    {
      id: 'supplier',
      label: 'Proveedor',
      render: ({ quote }) => supplierLabel(quote.supplier, quote.supplierId),
    },
    {
      id: 'quality',
      label: 'Calidad',
      width: 90,
      render: ({ quote }) => (
        <UncertainValue
          verified={quote.partType !== PART_TYPE.ORIGINAL}
          reason="OEM declarado por el proveedor: se confirma con foto o muestra"
        >
          {QUALITY_LABEL[quote.partType]}
        </UncertainValue>
      ),
    },
    {
      id: 'incoterm',
      label: 'Incoterm',
      width: 100,
      render: ({ quote }) => (
        <UncertainValue
          verified={quote.incotermConfirmed}
          reason={
            quote.incoterm
              ? 'Incoterm sin confirmar por escrito'
              : 'La cotización no indica Incoterm'
          }
        >
          {quote.incoterm
            ? `${quote.incoterm}${quote.incotermPlace ? ` ${quote.incotermPlace}` : ''}`
            : 'Sin definir'}
        </UncertainValue>
      ),
    },
    {
      id: 'price',
      label: 'Precio',
      width: 100,
      align: 'right',
      tooltip:
        'Precio unitario en la moneda del proveedor. Con tramos por volumen se usa el más alto.',
      render: ({ quote }) => (
        <UncertainValue
          verified={quote.currencyConfirmed}
          reason="Moneda sin confirmar por el proveedor"
        >
          {quote.currency ? (
            <MoneyValue money={unitPriceMoney(quote)} />
          ) : (
            quote.priceAmount.toFixed(2)
          )}
        </UncertainValue>
      ),
    },
    {
      id: 'landed',
      label: 'Costo final',
      width: 100,
      align: 'right',
      tooltip:
        'Costo unitario puesto en Chile, sin IVA. Estimado con los parámetros y supuestos vigentes.',
      render: ({ cost }) => (
        <UncertainValue
          verified={false}
          reason={
            cost.landedNetUsdMicro === null
              ? cost.blockers.join('; ')
              : 'Costo estimado, sin verificar'
          }
        >
          {cost.landedNetUsdMicro === null ? (
            shortReason(cost.blockers[0])
          ) : (
            <MoneyFromMicros micros={cost.landedNetUsdMicro} currency="USD" />
          )}
        </UncertainValue>
      ),
    },
  ]

  return (
    <ContentWidth>
      <PageHeader
        back={{ href: '/catalog', label: 'Catálogo' }}
        title={part.nameEs}
        description={`${part.vehicle?.brand ?? ''} ${part.vehicle?.model ?? ''} · ${part.category?.labelEs ?? part.categoryPath}`}
      />

      {editing === EDIT.CODE ? (
        <CodeDialog part={part} onSaved={saved} onClose={closeEditor} />
      ) : null}
      {editing === EDIT.NAMES ? (
        <NamesDialog part={part} onSaved={saved} onClose={closeEditor} />
      ) : null}
      {editing === EDIT.LOGISTICS ? (
        <LogisticsDialog part={part} onSaved={saved} onClose={closeEditor} />
      ) : null}
      {editing === EDIT.IMAGE ? (
        <ImageDialog
          part={part}
          image={image}
          onSaved={() => setImageKey((k) => k + 1)}
          onClose={closeEditor}
        />
      ) : null}
      {editing === EDIT.CUSTOMS ? (
        <SourcedValueDialog
          title="Partida arancelaria"
          label="Partida arancelaria HS"
          initial={part.hsCode ?? ''}
          initialSource={part.hsCodeSource ?? ''}
          onClose={closeEditor}
          onSave={async (value, source) => {
            await updatePartCustoms(part.id, { hsCode: value, source })
            saved()
          }}
        />
      ) : null}

      <Card sx={{ p: 2, mb: 1.5, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Box
          role="button"
          tabIndex={0}
          aria-label="Cargar imagen"
          onClick={() => setEditing(EDIT.IMAGE)}
          onKeyDown={(e) => e.key === 'Enter' && setEditing(EDIT.IMAGE)}
          sx={{
            width: PART_IMAGE_SIZE,
            height: PART_IMAGE_SIZE,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: 'brand.bodyBg',
          }}
        >
          {image?.dataUrl ? (
            <Box
              component="img"
              src={image.dataUrl}
              alt={part.nameEs}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Typography variant="caption" color="error.main">
              Sin imagen
            </Typography>
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <InfoGrid columns={6}>
            <InfoField label="Código" onEdit={() => setEditing(EDIT.CODE)}>
              <UncertainValue
                verified={part.codeStatus === 'confirmed'}
                reason="Código sin confirmar con una fuente citable"
              >
                <Box component="span" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: 12 }}>
                  {part.code ?? 'Sin código'}
                </Box>
              </UncertainValue>
            </InfoField>
            <InfoField label="Precio referencia">
              <MoneyValue money={part.baselinePrice} />
            </InfoField>
            <InfoField label="Peso" onEdit={() => setEditing(EDIT.LOGISTICS)}>
              <UncertainValue verified={logisticsConfirmed} reason={logisticsReason}>
                {formatKg(part.weightG)}
              </UncertainValue>
            </InfoField>
            <InfoField label="Volumen" onEdit={() => setEditing(EDIT.LOGISTICS)}>
              <UncertainValue verified={logisticsConfirmed} reason={logisticsReason}>
                {formatLiters(part.volumeCm3)}
              </UncertainValue>
            </InfoField>
            {bestCostField(PART_TYPE.ORIGINAL, 'Mejor costo OEM')}
            {bestCostField(PART_TYPE.ALTERNATIVE, 'Mejor costo AFM')}
          </InfoGrid>
        </Box>
      </Card>

      <ViewTabs value={tab} onChange={setTab} tabs={TAB_LIST} />

      {tab === PART_TABS.QUOTES ? (
        <ListTable
          columns={quoteColumns}
          rows={rows}
          getRowKey={({ quote }) => quote.id}
          getRowHref={({ quote }) => `/quotes/${quotationId(quote.supplierId, quote.sourceFile)}`}
          emptyText="Sin cotizaciones todavía."
        />
      ) : null}

      {tab === PART_TABS.IDENTITY ? (
        <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <InfoGrid columns={3}>
            <InfoField label="Español">{part.nameEs}</InfoField>
            <InfoField label="Inglés" onEdit={() => setEditing(EDIT.NAMES)}>
              {part.nameEn ?? (
                <UncertainValue verified={false} reason="Sin traducción cargada">
                  Sin dato
                </UncertainValue>
              )}
            </InfoField>
            <InfoField label="Chino" onEdit={() => setEditing(EDIT.NAMES)}>
              {part.nameZh ?? (
                <UncertainValue verified={false} reason="Sin traducción cargada">
                  Sin dato
                </UncertainValue>
              )}
            </InfoField>
          </InfoGrid>
          <InfoGrid columns={3}>
            <InfoField label="Vehículo">
              {`${part.vehicle?.brand ?? ''} ${part.vehicle?.model ?? ''}`.trim() || '—'}
            </InfoField>
            <InfoField label="Categoría">{part.category?.labelEs ?? part.categoryPath}</InfoField>
            <InfoField label="Fuente del código">
              {part.codeSource ?? (
                <UncertainValue verified={false} reason="El código no tiene fuente registrada">
                  Sin fuente
                </UncertainValue>
              )}
            </InfoField>
          </InfoGrid>
          {part.sourcingNote ? (
            <InfoGrid>
              <InfoField label="Nota del código">{part.sourcingNote}</InfoField>
            </InfoGrid>
          ) : null}
        </Card>
      ) : null}

      {tab === PART_TABS.LOGISTICS ? (
        <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <InfoGrid columns={5}>
            <InfoField label="Peso" onEdit={() => setEditing(EDIT.LOGISTICS)}>
              <UncertainValue verified={logisticsConfirmed} reason={logisticsReason}>
                {formatKg(part.weightG)}
              </UncertainValue>
            </InfoField>
            <InfoField label="Volumen" onEdit={() => setEditing(EDIT.LOGISTICS)}>
              <UncertainValue verified={logisticsConfirmed} reason={logisticsReason}>
                {formatLiters(part.volumeCm3)}
              </UncertainValue>
            </InfoField>
            <InfoField label="Estado">
              <UncertainValue verified={logisticsConfirmed} reason={logisticsReason}>
                {LOGISTICS_STATUS_LABELS_ES[part.logisticsStatus]}
              </UncertainValue>
            </InfoField>
            <InfoField label="Fuente">
              {part.logisticsSource ?? (
                <UncertainValue
                  verified={false}
                  reason="Sin fuente: estimación por nombre de pieza"
                >
                  Sin fuente
                </UncertainValue>
              )}
            </InfoField>
            <InfoField label="Mercancía peligrosa">
              {part.dgProfile ? (
                `UN ${part.dgProfile.unNumber}`
              ) : (
                <UncertainValue
                  verified={false}
                  reason="Falta clasificar si lleva batería de litio u otra mercancía peligrosa"
                >
                  Sin clasificar
                </UncertainValue>
              )}
            </InfoField>
          </InfoGrid>
          {part.logisticsNote ? (
            <InfoGrid columns={5}>
              <InfoField label="Nota">{part.logisticsNote}</InfoField>
            </InfoGrid>
          ) : null}
        </Card>
      ) : null}

      {tab === PART_TABS.CUSTOMS ? (
        <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <InfoGrid>
            <InfoField label="Partida HS" onEdit={() => setEditing(EDIT.CUSTOMS)}>
              <UncertainValue
                verified={Boolean(part.hsCode && part.hsCodeSource)}
                reason="Sin partida confirmada con el agente de aduanas"
              >
                {part.hsCode ?? 'Sin dato'}
              </UncertainValue>
            </InfoField>
            <InfoField label="Fuente">
              {part.hsCodeSource ?? (
                <UncertainValue verified={false} reason="Sin fuente registrada">
                  Sin fuente
                </UncertainValue>
              )}
            </InfoField>
          </InfoGrid>
        </Card>
      ) : null}
    </ContentWidth>
  )
}
