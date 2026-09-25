'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import { useRouteId } from '@hooks/useRouteId'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ViewTabs from '@components/common/ViewTabs'
import UncertainValue from '@components/common/UncertainValue'
import SourcedValueDialog from '@components/common/SourcedValueDialog'
import TextValueDialog from '@components/common/TextValueDialog'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { useUrlTab } from '@hooks/useUrlTab'
import { updateSupplierFact, updateSupplierField } from '@libs/repos/suppliersRepo'
import { formatDate, supplierLabel } from '@features/quotes/constants'
import QualityChips from '@features/quotes/components/QualityChips'
import {
  COUNTRY_LABELS_ES,
  PLATFORM_LABELS_ES,
  labelOf,
  CONTACT_FIELDS,
  FACTS,
  IDENTITY_FIELDS,
  SUPPLIER_TABS,
  TAB_LIST,
  factOf,
  factText,
  getPath,
} from './constants'
import { useSuppliers } from './hooks/useSuppliers'

export default function SupplierDetailPage() {
  const supplierId = useRouteId()
  const { rows, loading, error, reload } = useSuppliers()
  const [tab, setTab] = useUrlTab(Object.values(SUPPLIER_TABS))
  // { kind: 'fact', key } o { kind: 'field', path, label }
  const [editing, setEditing] = useState(null)

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
  const row = rows.find((r) => r.supplier.id === supplierId)
  if (!row) {
    return (
      <ContentWidth>
        <PageHeader
          back={{ href: '/suppliers', label: 'Proveedores' }}
          title="Proveedor no encontrado"
        />
      </ContentWidth>
    )
  }
  const { supplier, quotations, partCount } = row

  const closeEditor = () => setEditing(null)
  const closeAndReload = () => reload()

  /** Dato con fuente: rojo hasta que se confirma; lápiz para confirmarlo o corregirlo. */
  const factField = (key) => {
    const fact = factOf(supplier, key)
    return (
      <InfoField
        key={key}
        label={FACTS[key].label}
        onEdit={() => setEditing({ kind: 'fact', key })}
      >
        <UncertainValue
          verified={fact.confirmed}
          reason={
            fact.value
              ? (fact.note ?? 'Declarado, sin confirmar con una fuente')
              : 'Sin dato: pedirlo al proveedor'
          }
        >
          {factText(key, fact.value) ?? 'Sin dato'}
        </UncertainValue>
      </InfoField>
    )
  }

  /** Campo simple: rojo solo si falta. */
  const textField = ({ path, label }) => {
    const value = getPath(supplier, path)
    return (
      <InfoField key={path} label={label} onEdit={() => setEditing({ kind: 'field', path, label })}>
        {value ?? (
          <UncertainValue verified={false} reason="Sin dato">
            Sin dato
          </UncertainValue>
        )}
      </InfoField>
    )
  }

  const quoteColumns = [
    {
      id: 'file',
      label: 'Cotización',
      render: (q) => q.sourceFile ?? 'Sin archivo de origen',
    },
    { id: 'sells', label: 'Oferta', width: 130, render: (q) => <QualityChips quotation={q} /> },
    {
      id: 'incoterm',
      label: 'Incoterm',
      width: 90,
      render: (q) => (
        <UncertainValue verified={q.incotermConfirmed} reason="Incoterm sin confirmar">
          {q.incoterms.join(', ') || 'Sin definir'}
        </UncertainValue>
      ),
    },
    {
      id: 'currency',
      label: 'Moneda',
      width: 70,
      render: (q) => (
        <UncertainValue verified={q.currencyConfirmed} reason="Moneda sin confirmar">
          {q.currencies.join(', ')}
        </UncertainValue>
      ),
    },
    { id: 'parts', label: 'Repuestos', width: 90, align: 'right', render: (q) => q.partCount },
    { id: 'date', label: 'Fecha', width: 100, render: (q) => formatDate(q.capturedAt) },
  ]

  const declarations = supplier.declarations ?? []

  return (
    <ContentWidth>
      <PageHeader
        back={{ href: '/suppliers', label: 'Proveedores' }}
        title={supplierLabel(supplier, supplier.id)}
        description={supplier.name}
      />

      {editing?.kind === 'fact' ? (
        <SourcedValueDialog
          title={FACTS[editing.key].label}
          label={FACTS[editing.key].label}
          initial={factOf(supplier, editing.key).value ?? ''}
          initialSource={factOf(supplier, editing.key).source ?? ''}
          options={FACTS[editing.key].options}
          onClose={closeEditor}
          onSave={async (value, source) => {
            await updateSupplierFact(supplier.id, editing.key, { value, source })
            closeAndReload()
          }}
        />
      ) : null}
      {editing?.kind === 'field' ? (
        <TextValueDialog
          title={editing.label}
          label={editing.label}
          initial={getPath(supplier, editing.path) ?? ''}
          onClose={closeEditor}
          onSave={async (value) => {
            await updateSupplierField(supplier.id, editing.path, value)
            closeAndReload()
          }}
        />
      ) : null}

      <Card sx={{ p: 2, mb: 1.5 }}>
        <InfoGrid columns={5}>
          {factField('type')}
          {factField('formF')}
          {factField('location')}
          <InfoField label="Cotizaciones">{quotations.length}</InfoField>
          <InfoField label="Repuestos">{partCount}</InfoField>
        </InfoGrid>
      </Card>

      <ViewTabs value={tab} onChange={setTab} tabs={TAB_LIST} />

      {tab === SUPPLIER_TABS.QUOTES ? (
        <ListTable
          columns={quoteColumns}
          rows={quotations}
          getRowKey={(q) => q.id}
          getRowHref={(q) => `/quotes/${q.id}`}
          emptyText="Sin cotizaciones cargadas."
        />
      ) : null}

      {tab === SUPPLIER_TABS.IDENTITY ? (
        <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <InfoGrid columns={3}>{IDENTITY_FIELDS.map(textField)}</InfoGrid>
          <InfoGrid columns={3}>
            <InfoField label="País">
              {labelOf(COUNTRY_LABELS_ES, supplier.country) ?? '—'}
            </InfoField>
            <InfoField label="Plataforma">
              {labelOf(PLATFORM_LABELS_ES, supplier.platform) ?? '—'}
            </InfoField>
            <InfoField label="Enlace">
              {supplier.platform_url ? (
                <Box
                  component="a"
                  href={supplier.platform_url}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ color: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {supplier.platform_url}
                </Box>
              ) : (
                '—'
              )}
            </InfoField>
          </InfoGrid>
        </Card>
      ) : null}

      {tab === SUPPLIER_TABS.CONTACT ? (
        <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <InfoGrid columns={3}>{CONTACT_FIELDS.slice(0, 3).map(textField)}</InfoGrid>
          <InfoGrid columns={3}>{CONTACT_FIELDS.slice(3).map(textField)}</InfoGrid>
        </Card>
      ) : null}

      {tab === SUPPLIER_TABS.TERMS ? (
        <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <InfoGrid columns={4}>
            {['moq', 'payment', 'leadTime', 'license'].map(factField)}
          </InfoGrid>
          <InfoGrid columns={4}>{['port', 'airport'].map(factField)}</InfoGrid>
        </Card>
      ) : null}

      {tab === SUPPLIER_TABS.DECLARATIONS ? (
        <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {declarations.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin declaraciones registradas.
            </Typography>
          ) : (
            declarations.map((text) => (
              <Typography key={text} variant="body2" color="error.main" sx={{ fontSize: 13 }}>
                {text}
              </Typography>
            ))
          )}
        </Card>
      ) : null}
    </ContentWidth>
  )
}
