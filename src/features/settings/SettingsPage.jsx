'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ViewTabs from '@components/common/ViewTabs'
import InfoNote from '@components/common/InfoNote'
import ModalActionButton from '@components/common/ModalActionButton'
import { useUrlTab } from '@hooks/useUrlTab'
import { useCostAssumptions } from '@features/quotes/hooks/useCostAssumptions'
import {
  CostParametersForm,
  DEFAULT_EDITABLE,
  GlobalRatesFields,
  TABS as COST_TABS,
  differsFromDefaults,
} from '@features/quotes/components/CostParametersDialog'
import { SETTINGS_HELP, SETTINGS_TABS, SETTINGS_TAB_LIST } from './constants'

const sameDraft = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Ajustes: parámetros globales de costo y venta (márgenes de PVP por modo, aranceles con y sin
 * TLC, tarifas y gastos). Se edita un borrador y se aplica con "Aplicar", igual que en la
 * Calculadora; lo aplicado lo ven todas las pantallas.
 */
export default function SettingsPage() {
  const { mode, setMode, rates, setRates } = useCostAssumptions()
  const [tab, setTab] = useUrlTab(Object.values(SETTINGS_TABS))
  const [costTab, setCostTab] = useState(COST_TABS.PARAMS)
  const [edit, setEdit] = useState(null)

  const current = { mode, rates: { ...rates, chargeOverrides: { ...rates.chargeOverrides } } }
  const draft = edit ?? current
  const dirty = edit !== null && !sameDraft(edit, current)

  const apply = () => {
    setMode(draft.mode)
    setRates(draft.rates)
    setEdit(null)
  }

  return (
    <ContentWidth>
      <PageHeader
        title="Ajustes"
        meta="Parámetros globales de costo y venta."
        actions={<InfoNote title="Sobre estos ajustes" paragraphs={SETTINGS_HELP} />}
      />

      <ViewTabs value={tab} onChange={setTab} tabs={SETTINGS_TAB_LIST} />

      <Card sx={{ p: 2 }}>
        {tab === SETTINGS_TABS.SALES ? (
          <GlobalRatesFields draft={draft} setDraft={(fn) => setEdit(fn(draft))} />
        ) : (
          <CostParametersForm
            draft={draft}
            setDraft={(fn) => setEdit(fn(draft))}
            tab={costTab}
            setTab={setCostTab}
          />
        )}
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        {differsFromDefaults(draft.rates) ? (
          <ModalActionButton
            label="Restablecer"
            onClick={() => setEdit({ ...draft, rates: { ...DEFAULT_EDITABLE } })}
          />
        ) : (
          <span />
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {dirty ? (
            <ModalActionButton kind="outlined" label="Cancelar" onClick={() => setEdit(null)} />
          ) : null}
          {dirty ? <ModalActionButton kind="primary" label="Aplicar" onClick={apply} /> : null}
        </Box>
      </Box>
    </ContentWidth>
  )
}
