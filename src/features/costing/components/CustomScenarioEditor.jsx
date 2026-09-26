'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import FormGroup from '@mui/material/FormGroup'
import Typography from '@mui/material/Typography'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CheckboxRow from '@components/common/CheckboxRow'
import FilterChip from '@components/common/FilterChip'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { CUSTOM_SHIPPING, QUALITY, QUALITY_LABEL_ES } from '../orderSimulationModel'

const QUALITY_OPTIONS = [
  { value: QUALITY.OEM, label: 'Originales' },
  { value: QUALITY.ANY, label: 'Más económico' },
  { value: QUALITY.AFM, label: 'Solo alternativos' },
]
const SHIPPING_OPTIONS = [
  { value: CUSTOM_SHIPPING.SEA, label: 'Marítimo, el más barato' },
  { value: CUSTOM_SHIPPING.LCL, label: 'Marítimo LCL' },
  { value: CUSTOM_SHIPPING.FCL_20, label: "Marítimo FCL 20'" },
  { value: CUSTOM_SHIPPING.FCL_40, label: "Marítimo FCL 40' HC" },
  { value: CUSTOM_SHIPPING.AIR, label: 'Aéreo' },
]
const shippingLabel = (value) => SHIPPING_OPTIONS.find((o) => o.value === value)?.label ?? value

/**
 * Escenario personalizado: el usuario elige qué se compra (originales, lo más económico o solo
 * alternativos), cómo se envía (marítimo o aéreo, con el formato exacto si quiere) y qué
 * proveedores incluir. Colapsado muestra un resumen; abierto, los controles. El resultado
 * aparece como una fila más de la tabla de escenarios.
 *
 * @param {Object} props
 * @param {{ quality: string, shipping: string, supplierIds: string[]|null }} props.custom
 *   `supplierIds: null` = todos los proveedores.
 * @param {(next: Object) => void} props.onChange
 * @param {Array<{ id: string, name: string }>} props.suppliers
 */
export default function CustomScenarioEditor({ custom, onChange, suppliers }) {
  const [open, setOpen] = useState(false)
  const selected = custom.supplierIds ?? suppliers.map((s) => s.id)
  const allSelected = selected.length === suppliers.length

  const toggleSupplier = (id) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    // Siempre queda al menos uno; con todos marcados vuelve a "todos".
    if (next.length === 0) return
    onChange({ ...custom, supplierIds: next.length === suppliers.length ? null : next })
  }

  const summary = [
    QUALITY_LABEL_ES[custom.quality],
    shippingLabel(custom.shipping),
    allSelected ? 'todos los proveedores' : `${selected.length} de ${suppliers.length} proveedores`,
  ].join(' · ')

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen((v) => !v)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          px: 0.5,
          minHeight: 32,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Escenario personalizado · {summary}
        </Typography>
        <KeyboardArrowDownIcon
          fontSize="small"
          sx={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </Box>
      {open ? (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
          <ToolbarSelectBox
            label="Qué se compra"
            value={custom.quality}
            onChange={(quality) => onChange({ ...custom, quality })}
            options={QUALITY_OPTIONS}
          />
          <ToolbarSelectBox
            label="Cómo se envía"
            value={custom.shipping}
            onChange={(shipping) => onChange({ ...custom, shipping })}
            options={SHIPPING_OPTIONS}
          />
          <FilterChip label="Proveedores" activeCount={allSelected ? 0 : selected.length}>
            <FormGroup sx={{ gap: 0.5 }}>
              {suppliers.map((s) => (
                <CheckboxRow
                  key={s.id}
                  checked={selected.includes(s.id)}
                  onChange={() => toggleSupplier(s.id)}
                  label={s.name}
                />
              ))}
            </FormGroup>
          </FilterChip>
        </Box>
      ) : null}
    </Box>
  )
}
