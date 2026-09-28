'use client'

import Button from '@mui/material/Button'
import { RADIUS } from '@constants/colors'

/**
 * Botón de acción al pie de un modal — más chico que los botones de la barra
 * de herramientas (32 px) y con tres jerarquías para distinguirlos: `primary`
 * (la acción principal, relleno), `outlined` (la alternativa de cierre, con borde,
 * ej. Cancelar) y `ghost` (acción auxiliar, solo texto, ej. Restablecer).
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {() => void} props.onClick
 * @param {'primary'|'outlined'|'ghost'} [props.kind]
 */
export default function ModalActionButton({ label, onClick, kind = 'ghost' }) {
  return (
    <Button
      onClick={onClick}
      variant={{ primary: 'contained', outlined: 'outlined', ghost: 'text' }[kind]}
      disableElevation
      sx={{
        borderRadius: `${RADIUS.input}px`,
        height: 32,
        px: 2,
        minWidth: 0,
        fontSize: 13,
        fontWeight: 400,
        textTransform: 'none',
        whiteSpace: 'nowrap',
        ...(kind === 'outlined' ? { borderColor: 'divider' } : {}),
        color: { primary: undefined, outlined: 'text.primary', ghost: 'text.secondary' }[kind],
      }}
    >
      {label}
    </Button>
  )
}
