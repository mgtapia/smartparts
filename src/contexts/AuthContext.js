'use client'

// Sesión de usuario — Google Auth vía Firebase (ver docs/SEGURIDAD-Y-ROLES.md).
// `role`/`canViewMargin` salen del custom claim del ID token, nunca de un campo
// de Firestore editable por el cliente.
//
// `ALLOWED_EMAILS` es el borde real hoy (ver src/constants/allowedEmails.js y
// firestore.rules): el proyecto es privado al equipo mientras no hay más
// usuarios que ameriten diferenciar por rol. Se refuerza acá (UX: no dejar
// pasar a alguien que igual va a chocar contra las Security Rules) pero el
// borde de verdad es Firestore — nunca confiar solo en este chequeo cliente.
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { getFirebaseAuth, getGoogleProvider } from '@libs/firebase/client'
import { ALLOWED_EMAILS } from '@constants/allowedEmails'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [canViewMargin, setCanViewMargin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
      if (nextUser && !ALLOWED_EMAILS.includes(nextUser.email)) {
        await signOut(getFirebaseAuth())
        setUser(null)
        setRole(null)
        setCanViewMargin(false)
        setUnauthorized(true)
        setLoading(false)
        return
      }
      setUnauthorized(false)
      setUser(nextUser)
      if (nextUser) {
        const tokenResult = await nextUser.getIdTokenResult()
        setRole(tokenResult.claims.role ?? null)
        setCanViewMargin(Boolean(tokenResult.claims.canViewMargin))
      } else {
        setRole(null)
        setCanViewMargin(false)
      }
      setLoading(false)
    })
  }, [])

  const value = {
    user,
    role,
    canViewMargin,
    loading,
    unauthorized,
    signInWithGoogle: () => signInWithPopup(getFirebaseAuth(), getGoogleProvider()),
    signOutUser: () => signOut(getFirebaseAuth()),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
