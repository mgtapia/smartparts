'use client'

import Link from 'next/link'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import { RADIUS } from '@constants/colors'

/**
 * Botón de la barra de herramientas para acciones (abrir un modal, etc.): mismo
 * lenguaje que las pastillas de filtro (pill, 44 px, 13 px, sin negrita) pero
 * sin chevron, porque no despliega una lista sino que abre otra cosa.
 * `disabled` con `tooltip` explica por qué la acción no está disponible.
 */
export default function ToolbarButton({ label, onClick, startIcon, href, disabled, tooltip }) {
  const button = (
    <Button
      {...(href ? { component: Link, href } : {})}
      variant="outlined"
      onClick={onClick}
      startIcon={startIcon}
      disabled={disabled}
      sx={{
        borderRadius: `${RADIUS.input}px`,
        borderColor: 'divider',
        color: 'text.primary',
        fontSize: 13,
        fontWeight: 400,
        textTransform: 'none',
        px: 2.5,
        height: 44,
        whiteSpace: 'nowrap',
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
      }}
    >
      {label}
    </Button>
  )
  if (!tooltip) return button
  // Un botón deshabilitado no recibe eventos del mouse: el span lleva el tooltip.
  return (
    <Tooltip title={tooltip}>
      <Box component="span" sx={{ display: 'inline-flex' }}>
        {button}
      </Box>
    </Tooltip>
  )
}
