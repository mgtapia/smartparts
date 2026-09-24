'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import InfoNote from '@components/common/InfoNote'
import ModalActionButton from '@components/common/ModalActionButton'
import ToolbarButton from '@components/common/ToolbarButton'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { RADIUS } from '@constants/colors'
import { MODE_OPTIONS, PARAMETERS_HELP } from '../constants'
import NumberField from './NumberField'

/**
 * Parámetros generales del cálculo de costo (modo de transporte, tarifas de
 * flete, factor volumétrico y aranceles), en un modal. Son estimaciones del
 * equipo, sin verificar: los costos que salen de acá van en rojo. Cuando haya
 * cotizaciones reales de forwarder y del agente de aduanas, se reemplazan por
 * parámetros versionados. Lo que depende de cada proveedor (gastos de origen,
 * Formulario F) se edita en la cotización de ese proveedor.
 */
export default function CostParametersDialog({ mode, setMode, rates, setRates, onReset }) {
  const [open, setOpen] = useState(false)
  // Solo se piden los parámetros del modo elegido; los aranceles aplican a todos.
  const isAir = mode === 'air' || mode === 'courier'

  return (
    <>
      <ToolbarButton label="Parámetros" onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
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
          <Box
            sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 2, rowGap: 2, pt: 1 }}
          >
            <Box
              sx={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}
            >
              <Typography variant="caption" color="text.secondary">
                Modo de transporte
              </Typography>
              <ToolbarSelectBox
                fullWidth
                label="Modo de transporte"
                value={mode}
                onChange={setMode}
                options={MODE_OPTIONS}
              />
            </Box>

            {isAir ? (
              <>
                <NumberField
                  label="Tarifa aérea (US$/kg cobrable)"
                  adornment="US$"
                  value={rates.airUsdPerKgCents / 100}
                  onCommit={(n) => setRates({ ...rates, airUsdPerKgCents: Math.round(n * 100) })}
                />
                <NumberField
                  label="Factor volumétrico aéreo (cm³/kg)"
                  adornment="cm³"
                  value={rates.airVolumetricDivisor}
                  onCommit={(n) =>
                    n > 0 && setRates({ ...rates, airVolumetricDivisor: Math.round(n) })
                  }
                />
              </>
            ) : (
              <NumberField
                label="Tarifa marítima LCL (US$/W-M)"
                adornment="US$"
                value={rates.seaUsdPerRtCents / 100}
                onCommit={(n) => setRates({ ...rates, seaUsdPerRtCents: Math.round(n * 100) })}
              />
            )}
            <NumberField
              label="Arancel ad valorem general (% CIF)"
              adornment="%"
              value={rates.generalDutyBp / 100}
              onCommit={(n) => setRates({ ...rates, generalDutyBp: Math.round(n * 100) })}
            />
            <NumberField
              label="Arancel TLC Chile-China (% CIF)"
              adornment="%"
              value={rates.ftaDutyBp / 100}
              onCommit={(n) => setRates({ ...rates, ftaDutyBp: Math.round(n * 100) })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <ModalActionButton label="Restablecer" onClick={onReset} />
          <ModalActionButton kind="primary" label="Cerrar" onClick={() => setOpen(false)} />
        </DialogActions>
      </Dialog>
    </>
  )
}
