'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import ToolbarButton from '@components/common/ToolbarButton'
import NumberField from './NumberField'

/**
 * Parámetros generales del cálculo de costo (tarifas de flete y arancel con
 * TLC), en un modal. Son estimaciones del equipo, sin verificar: se explican en
 * rojo y los costos que salen de acá también van en rojo. Cuando haya
 * cotizaciones reales de forwarder y del agente de aduanas, se reemplazan por
 * parámetros versionados. Lo que depende de cada proveedor no está acá: se edita
 * en la cotización de ese proveedor.
 */
export default function CostParametersDialog({ rates, setRates, onReset }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ToolbarButton label="Parámetros" onClick={() => setOpen(true)} />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Parámetros de cálculo</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="error.main" sx={{ fontSize: 13 }}>
            Estimaciones del equipo, sin verificar: reemplazar por cotizaciones reales de forwarder
            y del agente de aduanas.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <NumberField
              label="Flete aéreo (por kg cobrable)"
              adornment="US$"
              value={rates.airUsdPerKgCents / 100}
              onCommit={(n) => setRates({ ...rates, airUsdPerKgCents: Math.round(n * 100) })}
            />
            <NumberField
              label="Flete marítimo LCL (por m³)"
              adornment="US$"
              value={rates.seaUsdPerRtCents / 100}
              onCommit={(n) => setRates({ ...rates, seaUsdPerRtCents: Math.round(n * 100) })}
            />
            <NumberField
              label="Arancel con TLC (Formulario F)"
              adornment="%"
              value={rates.ftaDutyBp / 100}
              onCommit={(n) => setRates({ ...rates, ftaDutyBp: Math.round(n * 100) })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onReset} sx={{ textTransform: 'none' }}>
            Restablecer
          </Button>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
