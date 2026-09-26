'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ViewTabs from '@components/common/ViewTabs'
import InfoNote from '@components/common/InfoNote'
import ModalActionButton from '@components/common/ModalActionButton'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { useAuth } from '@contexts/AuthContext'
import { useUrlTab } from '@hooks/useUrlTab'
import { saveGlobalSettings } from '@libs/repos/globalSettingsRepo'
import { SHIPPING_MODES } from '@constants/enums'
import {
  CostParametersForm,
  GlobalRatesFields,
  TABS as COST_TABS,
  differsFromBase,
} from '@features/quotes/components/CostParametersDialog'
import { DEFAULT_GLOBAL_PARAMS, DEFAULT_RATES, pickEditable } from './globalSettingsModel'
import { useGlobalSettings } from './hooks/useGlobalSettings'
import { SETTINGS_HELP, SETTINGS_TABS, SETTINGS_TAB_LIST } from './constants'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Ajustes: parámetros globales de costo y venta (márgenes de PVP por modo, aranceles con y sin
 * TLC, IVA, seguro, tarifas y gastos). "Aplicar" guarda una versión nueva en la base y todas las
 * pantallas la usan; los cambios de los modales de cada pantalla son solo temporales.
 */
export default function SettingsPage() {
  const global = useGlobalSettings()
  const { user } = useAuth()
  const [tab, setTab] = useUrlTab(Object.values(SETTINGS_TABS))
  const [costTab, setCostTab] = useState(COST_TABS.PARAMS)
  // El modo solo elige qué tarifas se ven en el formulario: no se guarda.
  const [mode, setMode] = useState(SHIPPING_MODES.AIR)
  const [edit, setEdit] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  if (global.loading) {
    return (
      <ContentWidth>
        <DetailPageSkeleton rows={6} />
      </ContentWidth>
    )
  }
  if (global.error) {
    return (
      <ContentWidth>
        <ErrorState message="No se pudieron leer los ajustes guardados." />
      </ContentWidth>
    )
  }

  const saved = { rates: global.editableRates, params: global.globalParams }
  const draft = { mode, ...(edit ?? saved) }
  const dirty = edit !== null && !same(edit, saved)
  const setDraft = (fn) => {
    const next = fn(draft)
    setMode(next.mode)
    setEdit({ rates: next.rates, params: next.params })
  }
  const referenceRates = pickEditable({ ...DEFAULT_RATES })

  const apply = async () => {
    setSaving(true)
    setSaveError(false)
    try {
      await saveGlobalSettings({
        rates: pickEditable(draft.rates),
        params: draft.params,
        createdBy: user?.email ?? null,
      })
      setEdit(null)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  const differsFromReference =
    differsFromBase(draft.rates, referenceRates) || !same(draft.params, DEFAULT_GLOBAL_PARAMS)

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
          <GlobalRatesFields draft={draft} setDraft={setDraft} />
        ) : (
          <CostParametersForm
            draft={draft}
            setDraft={setDraft}
            tab={costTab}
            setTab={setCostTab}
            globalParams={draft.params}
          />
        )}
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
        {differsFromReference ? (
          <ModalActionButton
            label="Restablecer"
            onClick={() => setEdit({ rates: referenceRates, params: { ...DEFAULT_GLOBAL_PARAMS } })}
          />
        ) : (
          <span />
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {saveError ? (
            <Typography variant="caption" color="error.main">
              No se pudo guardar.
            </Typography>
          ) : null}
          {dirty ? (
            <ModalActionButton kind="outlined" label="Cancelar" onClick={() => setEdit(null)} />
          ) : null}
          {dirty ? (
            <ModalActionButton
              kind="primary"
              label={saving ? 'Guardando…' : 'Aplicar'}
              onClick={apply}
            />
          ) : null}
        </Box>
      </Box>
    </ContentWidth>
  )
}
