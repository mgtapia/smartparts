'use client'

import { cloneElement, isValidElement, useState } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import Divider from '@mui/material/Divider'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import LinkIcon from '@mui/icons-material/Link'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import Typography from '@mui/material/Typography'
import InfoNote from '@components/common/InfoNote'
import UncertainValue from '@components/common/UncertainValue'
import ModalActionButton from '@components/common/ModalActionButton'
import TuneIcon from '@mui/icons-material/Tune'
import ToolbarIconButton from '@components/common/ToolbarIconButton'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import NumberField from '@components/common/NumberField'
import { RADIUS } from '@constants/colors'
import {
  DEFAULT_PARAM_SET,
  DEFAULT_UNIT_COST_ASSUMPTIONS,
  FREIGHT_SOURCES,
  SHIPMENT_CHARGES,
} from '@mocks/costParams'
import { MODE_OPTIONS, PARAMETERS_HELP } from '../constants'

const fromCents = (c) => (c == null ? null : c / 100)
const toCents = (n) => (n == null ? null : Math.round(n * 100))
const fromBp = (bp) => (bp == null ? null : bp / 100)
const toBp = (n) => (n == null ? null : Math.round(n * 100))
const fromMicro = (m) => (m == null ? null : m / 1e6)
const toMicro = (n) => (n == null ? null : Math.round(n * 1e6))
const pct = (bp) => `${(bp / 100).toLocaleString('es-CL')} %`

const { defaultOriginCostBp, generalDutyBp, ftaDutyBp, ...DEFAULT_EDITABLE } =
  DEFAULT_UNIT_COST_ASSUMPTIONS

const SHIPMENT_SIZE_SOURCES = {
  sea: {
    labelEs: 'interbal.cl, importación real de 4 m³ (agosto 2026)',
    url: 'https://interbal.cl/cuanto-cuesta-importar-de-china-a-chile/',
    noteEs:
      'Los gastos por embarque se reparten según la parte del embarque que ocupa cada pieza: igual que un embarque lleno de esa pieza dividido por la cantidad de piezas. Ajustar al pedido real.',
  },
  air: {
    labelEs: 'Supuesto del equipo, sin fuente',
    noteEs:
      'Los gastos por embarque se reparten según la parte del embarque que ocupa cada pieza. Ajustar al pedido real.',
  },
}

/**
 * Todos los parámetros y supuestos del costo final, en el orden de la cadena: tamaño del
 * embarque, origen en China, flete y seguro, aduana, gastos en Chile y pago al proveedor. Cada
 * valor lleva su fuente; son referencias públicas o estimaciones del equipo, por eso van en
 * rojo. Se edita un borrador y se aplica con "Aplicar". Lo que depende de cada proveedor
 * (distancia al puerto, Formulario F) se edita en su ficha.
 */
export default function CostParametersDialog({ mode, setMode, rates, setRates }) {
  const [draft, setDraft] = useState(null)
  const isAir = draft?.mode === 'air' || draft?.mode === 'courier'
  const modeKey = isAir ? 'air' : 'sea'

  const openDialog = () =>
    setDraft({ mode, rates: { ...rates, chargeOverrides: { ...rates.chargeOverrides } } })
  const close = () => setDraft(null)
  const apply = () => {
    setMode(draft.mode)
    setRates(draft.rates)
    close()
  }
  const setRate = (patch) => setDraft((d) => ({ ...d, rates: { ...d.rates, ...patch } }))
  const setCharge = (code, patch) =>
    setDraft((d) => ({
      ...d,
      rates: {
        ...d.rates,
        chargeOverrides: {
          ...d.rates.chargeOverrides,
          [code]: { ...d.rates.chargeOverrides?.[code], ...patch },
        },
      },
    }))
  const chargesOf = (stage) =>
    SHIPMENT_CHARGES.filter((c) => c.stage === stage && c.modes.includes(modeKey)).map((c) => (
      <ChargeFields
        key={c.code}
        charge={{ ...c, ...draft.rates.chargeOverrides?.[c.code] }}
        isAir={isAir}
        onChange={setCharge}
      />
    ))

  return (
    <>
      <ToolbarIconButton label="Parámetros de cálculo" onClick={openDialog}>
        <TuneIcon fontSize="small" />
      </ToolbarIconButton>
      {draft ? (
        <Dialog
          open
          onClose={close}
          fullWidth
          maxWidth="md"
          slotProps={{ paper: { sx: { borderRadius: `${RADIUS.input}px` } } }}
        >
          <DialogTitle
            variant="subtitle1"
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            Parámetros de cálculo
            <InfoNote dense title="Sobre estos parámetros" paragraphs={PARAMETERS_HELP} />
          </DialogTitle>
          <DialogContent>
            <Grid>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">
                  Modo de transporte
                </Typography>
                <ToolbarSelectBox
                  fullWidth
                  label="Modo de transporte"
                  value={draft.mode}
                  onChange={(m) => setDraft((d) => ({ ...d, mode: m }))}
                  options={MODE_OPTIONS}
                />
              </Box>
              <Field source={SHIPMENT_SIZE_SOURCES[modeKey]}>
                {isAir ? (
                  <NumberField
                    label="Embarque típico (kg cobrables)"
                    adornment="kg"
                    value={draft.rates.airShipmentKg}
                    onCommit={(n) => n > 0 && setRate({ airShipmentKg: n })}
                  />
                ) : (
                  <NumberField
                    label="Embarque típico (m³)"
                    adornment="m³"
                    value={draft.rates.seaShipmentRt}
                    onCommit={(n) => n > 0 && setRate({ seaShipmentRt: n })}
                  />
                )}
              </Field>
            </Grid>

            <Section title="Origen">
              {chargesOf('inland')}
              {chargesOf('origin')}
            </Section>

            <Section title="Transporte">
              {isAir ? (
                <>
                  <Field source={FREIGHT_SOURCES.air}>
                    <NumberField
                      label="Flete aéreo (US$/kg)"
                      adornment="US$"
                      value={fromCents(draft.rates.airUsdPerKgCents)}
                      onCommit={(n) => n != null && setRate({ airUsdPerKgCents: toCents(n) })}
                    />
                  </Field>
                  <Field source={{ labelEs: 'Estándar IATA; algunos couriers usan 5000' }}>
                    <NumberField
                      label="Factor volumétrico (cm³/kg)"
                      adornment="cm³"
                      value={draft.rates.airVolumetricDivisor}
                      onCommit={(n) => n > 0 && setRate({ airVolumetricDivisor: Math.round(n) })}
                    />
                  </Field>
                </>
              ) : (
                <Field source={FREIGHT_SOURCES.sea}>
                  <NumberField
                    label="Flete marítimo LCL (US$/W-M)"
                    adornment="US$"
                    value={fromCents(draft.rates.seaUsdPerRtCents)}
                    onCommit={(n) => n != null && setRate({ seaUsdPerRtCents: toCents(n) })}
                  />
                </Field>
              )}
              <FixedValue
                label="Seguro (% FOB + flete)"
                value={`${pct(DEFAULT_PARAM_SET.insurance.rateBp)} de (FOB + flete) + ${pct(DEFAULT_PARAM_SET.insurance.markupBp)}`}
                reason="Tasa referencial, sin cotización de seguro"
              />
            </Section>

            <Section title="Aduana">
              <FixedValue
                label="Arancel general (% CIF)"
                value={pct(generalDutyBp)}
                reason="Fijo por ley, igual para todos los proveedores. Sin verificar con el agente de aduanas"
              />
              <FixedValue
                label="Arancel TLC (% CIF)"
                value={pct(ftaDutyBp)}
                reason="Solo con Formulario F y partida elegible. Sin verificar por partida"
              />
              <FixedValue
                label="IVA (% CIF + arancel)"
                value={pct(DEFAULT_PARAM_SET.vat.rateBp)}
                reason="Crédito fiscal recuperable: no se suma al costo final. Sin verificar con el SII"
              />
              {chargesOf('customs')}
            </Section>

            <Section title="Chile">{chargesOf('destination')}</Section>
            <Section title="Pago">{chargesOf('payment')}</Section>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <ModalActionButton
              label="Restablecer"
              onClick={() => setDraft((d) => ({ ...d, rates: { ...DEFAULT_EDITABLE } }))}
            />
            <ModalActionButton label="Cancelar" onClick={close} />
            <ModalActionButton kind="primary" label="Aplicar" onClick={apply} />
          </DialogActions>
        </Dialog>
      ) : null}
    </>
  )
}

function Grid({ children }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 2, rowGap: 2, pt: 1 }}>
      {children}
    </Box>
  )
}

function Section({ title, children }) {
  return (
    <>
      <Divider sx={{ my: 2.5 }} />
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Grid>{children}</Grid>
    </>
  )
}

/** Campo editable; la fuente va como ícono junto a la etiqueta, no como texto debajo. */
function Field({ source, children }) {
  return source && isValidElement(children)
    ? cloneElement(children, { labelSuffix: <SourceIcon source={source} /> })
    : children
}

/** Ícono de la fuente en rojo (referencia, no cotización): detalle al pasar el mouse, enlace al clic. */
function SourceIcon({ source }) {
  const title = (
    <>
      {source.labelEs}
      <br />
      {source.noteEs ?? 'Referencia, sin cotización real'}
    </>
  )
  const linkProps = source.url
    ? { component: 'a', href: source.url, target: '_blank', rel: 'noopener noreferrer' }
    : {}
  return (
    <Tooltip title={title}>
      <IconButton
        size="small"
        aria-label="Fuente"
        {...linkProps}
        sx={{ p: 0, color: 'error.main', flexShrink: 0 }}
      >
        {source.url ? (
          <LinkIcon sx={{ fontSize: 14 }} />
        ) : (
          <InfoOutlinedIcon sx={{ fontSize: 14 }} />
        )}
      </IconButton>
    </Tooltip>
  )
}

const BASE_ES = { cif: 'CIF', price: 'precio' }

/** Campos de un gasto según cómo se cobra: monto, por unidad, por distancia o porcentaje. */
function ChargeFields({ charge: c, isAir, onChange }) {
  // Un campo vacío no borra el gasto: se ignora hasta que haya un número.
  const set = (patch) => Object.values(patch).every((v) => v != null) && onChange(c.code, patch)
  const money = (label, key) => (
    <NumberField
      label={label}
      adornment="US$"
      value={fromCents(c[key])}
      onCommit={(n) => set({ [key]: toCents(n) })}
    />
  )
  const minimum = <Field>{money(`${c.labelEs}, mínimo (US$/embarque)`, 'minCents')}</Field>

  switch (c.basis) {
    case 'per_unit':
      return (
        <Field source={c.source}>
          {money(`${c.labelEs} (US$/${isAir ? 'kg' : 'm³'})`, 'amountCents')}
        </Field>
      )
    case 'distance_min':
      return (
        <>
          <Field source={c.source}>
            <NumberField
              label={`${c.labelEs} (US$/t·km)`}
              adornment="US$"
              value={fromMicro(c.rateMicroPerTonKm)}
              onCommit={(n) => set({ rateMicroPerTonKm: toMicro(n) })}
            />
          </Field>
          {minimum}
        </>
      )
    case 'percent_min':
    case 'percent_plus_fixed':
      return (
        <>
          <Field source={c.source}>
            <NumberField
              label={`${c.labelEs} (% ${BASE_ES[c.base]})`}
              adornment="%"
              value={fromBp(c.rateBp)}
              onCommit={(n) => set({ rateBp: toBp(n) })}
            />
          </Field>
          {c.basis === 'percent_min' ? (
            minimum
          ) : (
            <Field>{money(`${c.labelEs}, fijo (US$/embarque)`, 'amountCents')}</Field>
          )}
        </>
      )
    default:
      return <Field source={c.source}>{money(`${c.labelEs} (US$/embarque)`, 'amountCents')}</Field>
  }
}

/** Parámetro que no se edita acá; sin verificar, con el motivo en el tooltip. */
function FixedValue({ label, value, reason }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: 13, height: 44, lineHeight: '44px' }}>
        <UncertainValue verified={false} reason={reason}>
          {value}
        </UncertainValue>
      </Typography>
    </Box>
  )
}
