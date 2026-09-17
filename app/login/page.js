'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Image from 'next/image'
import GoogleIcon from '@mui/icons-material/Google'
import { useAuth } from '@contexts/AuthContext'
import { DEFAULT_AUTHENTICATED_PATH } from '@constants/routes'

export default function LoginPage() {
  const { user, loading, unauthorized, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [error, setError] = useState(null)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace(DEFAULT_AUTHENTICATED_PATH)
  }, [loading, user, router])

  async function handleSignIn() {
    setError(null)
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch {
      setError('No se pudo iniciar sesión. Probá de nuevo.')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        bgcolor: 'brand.railBg',
        color: 'white',
      }}
    >
      <Image src="/assets/brand/logo-smartdeal-white.svg" alt="SmartDeal" width={160} height={40} />
      <Button
        variant="contained"
        color="secondary"
        startIcon={<GoogleIcon />}
        onClick={handleSignIn}
        disabled={signingIn || loading}
      >
        Iniciar sesión con Google
      </Button>
      {error ? (
        <Typography variant="body2" color="error.main">
          {error}
        </Typography>
      ) : null}
      {unauthorized ? (
        <Typography variant="body2" color="error.main">
          Esa cuenta no tiene acceso a SmartParts todavía.
        </Typography>
      ) : null}
    </Box>
  )
}
