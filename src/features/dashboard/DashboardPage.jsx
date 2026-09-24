'use client'

import { useState } from 'react'
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ViewTabs from '@components/common/ViewTabs'
import UncertainValue from '@components/common/UncertainValue'
import SourcedValueDialog from '@components/common/SourcedValueDialog'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { useUrlTab } from '@hooks/useUrlTab'
import { updateMilestoneStep } from '@libs/repos/milestoneRepo'
import { supplierLabel } from '@features/quotes/constants'
import { DASHBOARD_TABS, MANUAL_STEPS, TAB_LIST } from './constants'
import { useDashboard } from './hooks/useDashboard'

export default function DashboardPage() {
  const { data, loading, error, reloadMilestone } = useDashboard()
  const [tab, setTab] = useUrlTab(Object.values(DASHBOARD_TABS))
  const [editingStep, setEditingStep] = useState(null)

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

  const { summary, pending, suppliers, steps } = data
  const supplierName = (id) => {
    const supplier = suppliers.find((s) => s.id === id)
    return supplier ? supplierLabel(supplier, id) : id
  }

  const pendingColumns = [
    { id: 'label', label: 'Pendiente', render: (p) => p.label },
    {
      id: 'count',
      label: 'Cantidad',
      width: 90,
      align: 'right',
      render: (p) => (
        <UncertainValue verified={false} reason="Falta confirmarlo o definirlo">
          {p.count}
        </UncertainValue>
      ),
    },
  ]

  const stepProgress = (step) =>
    step.manual?.key === MANUAL_STEPS.chosenSupplier.key && step.done
      ? supplierName(step.value.value)
      : step.progress

  const milestoneColumns = [
    { id: 'label', label: 'Paso', render: (s) => s.label },
    { id: 'progress', label: 'Avance', width: 180, render: (s) => stepProgress(s) },
    {
      id: 'state',
      label: 'Estado',
      width: 100,
      render: (s) => (
        <UncertainValue verified={s.done} reason="Falta cumplirlo o registrarlo">
          {s.done ? 'Cumplido' : 'Pendiente'}
        </UncertainValue>
      ),
    },
    {
      id: 'edit',
      label: '',
      width: 44,
      align: 'right',
      render: (s) =>
        s.manual ? (
          <Tooltip title="Registrar con su fuente">
            <IconButton
              size="small"
              aria-label={`Registrar ${s.label}`}
              onClick={() => setEditingStep(s)}
            >
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ) : null,
    },
  ]

  return (
    <ContentWidth>
      <PageHeader title="Dashboard" />

      {editingStep ? (
        <SourcedValueDialog
          title={editingStep.manual.label}
          label={editingStep.manual.field}
          initial={editingStep.value?.value ?? ''}
          initialSource={editingStep.value?.source ?? ''}
          options={
            editingStep.manual.key === MANUAL_STEPS.chosenSupplier.key
              ? suppliers.map((s) => ({ value: s.id, label: supplierLabel(s, s.id) }))
              : undefined
          }
          onClose={() => setEditingStep(null)}
          onSave={async (value, source) => {
            await updateMilestoneStep(editingStep.manual.key, { value, source })
            reloadMilestone()
          }}
        />
      ) : null}

      <Card sx={{ p: 2, mb: 1.5 }}>
        <InfoGrid columns={4}>
          <InfoField label="Proveedores">{summary.suppliersCount}</InfoField>
          <InfoField label="Repuestos cotizados">
            {summary.quotedPartsCount} de {summary.totalParts}
          </InfoField>
          <InfoField label="Cotizaciones">{summary.quotationsCount}</InfoField>
          <InfoField label="Avance del hito">
            {summary.stepsDone} de {summary.stepsTotal}
          </InfoField>
        </InfoGrid>
      </Card>

      <ViewTabs value={tab} onChange={setTab} tabs={TAB_LIST} />

      {tab === DASHBOARD_TABS.PENDING ? (
        <ListTable
          columns={pendingColumns}
          rows={pending}
          getRowKey={(p) => p.id}
          getRowHref={(p) => p.href}
          emptyText="Sin pendientes por confirmar."
        />
      ) : null}

      {tab === DASHBOARD_TABS.MILESTONE ? (
        <ListTable
          columns={milestoneColumns}
          rows={steps}
          getRowKey={(s) => s.id}
          getRowHref={(s) => s.href}
        />
      ) : null}
    </ContentWidth>
  )
}
