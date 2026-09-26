'use client'

import { useState } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import ListTable from '@components/common/ListTable'
import ToolbarButton from '@components/common/ToolbarButton'
import UncertainValue from '@components/common/UncertainValue'

/** Entero no negativo; vacío vuelve a la cantidad por defecto (`null`); cualquier otra cosa se ignora (`undefined`). */
const parseQty = (raw) => {
  if (raw === '') return null
  return /^\d+$/.test(raw) ? Number(raw) : undefined
}

/**
 * Cantidades del pedido por repuesto, editables. Colapsado muestra solo el resumen; abierto,
 * un campo por repuesto. Un campo vacío usa la cantidad por defecto (la que se ve de fondo);
 * 0 saca el repuesto del pedido.
 *
 * @param {Object} props
 * @param {Array<{ part: any, defaultQty: number, qty: number, edited: boolean }>} props.rows
 * @param {(partId: string, qty: number|null) => void} props.onChange
 * @param {() => void} props.onReset
 */
export default function QuantitiesEditor({ rows, onChange, onReset }) {
  const [open, setOpen] = useState(false)
  const editedCount = rows.filter((r) => r.edited).length
  const units = rows.reduce((acc, r) => acc + r.qty, 0)

  const columns = [
    {
      id: 'part',
      label: 'Repuesto',
      render: (r) => (
        <Link href={`/parts/${r.part.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          {r.part.nameEs}
        </Link>
      ),
    },
    {
      id: 'default',
      label: 'Por defecto',
      width: 100,
      align: 'right',
      tooltip: 'Cantidad según la fuente elegida: la estimada del cliente o una de cada una.',
      render: (r) => r.defaultQty.toLocaleString('es-CL'),
    },
    {
      id: 'qty',
      label: 'Cantidad',
      width: 110,
      align: 'right',
      render: (r) => (
        <TextField
          size="small"
          variant="standard"
          value={r.edited ? String(r.qty) : ''}
          placeholder={String(r.defaultQty)}
          onChange={(e) => {
            const qty = parseQty(e.target.value.trim())
            if (qty !== undefined) onChange(r.part.id, qty)
          }}
          slotProps={{
            htmlInput: { inputMode: 'numeric', style: { textAlign: 'right', fontSize: 13 } },
          }}
          sx={{ width: 80 }}
        />
      ),
    },
  ]

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Box
          role="button"
          tabIndex={0}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => e.key === 'Enter' && setOpen((v) => !v)}
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            px: 0.5,
            minHeight: 32,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Cantidades · {rows.length} repuestos · {units.toLocaleString('es-CL')} unidades
            {editedCount > 0 ? (
              <>
                {' · '}
                <UncertainValue
                  verified={false}
                  reason="Editadas por el equipo, no vienen del cliente"
                >
                  {editedCount} editadas
                </UncertainValue>
              </>
            ) : null}
          </Typography>
          <KeyboardArrowDownIcon
            fontSize="small"
            sx={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </Box>
        {open && editedCount > 0 ? <ToolbarButton label="Restablecer" onClick={onReset} /> : null}
      </Box>
      {open ? <ListTable columns={columns} rows={rows} getRowKey={(r) => r.part.id} /> : null}
    </Box>
  )
}
