'use client'

// Guarda las rutas de app/(app)/** — sin sesión, redirige a /login.
// Server-side no valida nada todavía (eso vive en Security Rules + el
// contrato de app/api/**, no en este componente): esto es UX, no el borde
// de seguridad real.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from '@contexts/AuthContext'
import { LOGIN_PATH } from '@constants/routes'

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace(LOGIN_PATH)
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={28} />
      </Box>
    )
  }

  return children
}
