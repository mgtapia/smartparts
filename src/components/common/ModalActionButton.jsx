'use client'

import Button from '@mui/material/Button'
import { RADIUS } from '@constants/colors'

/**
 * Botón de acción al pie de un modal — más chico que los botones de la barra
 * de herramientas (32 px) y con dos jerarquías para distinguirlos: `primary`
 * (la acción principal, relleno) y `ghost` (acción secundaria, solo texto).
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {() => void} props.onClick
 * @param {'primary'|'ghost'} [props.kind]
 */
export default function ModalActionButton({ label, onClick, kind = 'ghost' }) {
  return (
    <Button
      onClick={onClick}
      variant={kind === 'primary' ? 'contained' : 'text'}
      disableElevation
      sx={{
        borderRadius: `${RADIUS.pill}px`,
        height: 32,
        px: 2,
        minWidth: 0,
        fontSize: 13,
        fontWeight: 400,
        textTransform: 'none',
        whiteSpace: 'nowrap',
        color: kind === 'primary' ? undefined : 'text.secondary',
      }}
    >
      {label}
    </Button>
  )
}
