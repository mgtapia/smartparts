'use client'

// Sesión de usuario — Google Auth vía Firebase (ver docs/SEGURIDAD-Y-ROLES.md).
// `role`/`canViewMargin` salen del custom claim del ID token, nunca de un campo
// de Firestore editable por el cliente. Hasta que Firebase Admin tenga
// credenciales (ver .agent/STATUS.md §Bloqueos) no hay claims asignados
// todavía: quedan en `null` y el rail no filtra por permiso aún.
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { getFirebaseAuth, getGoogleProvider } from '@libs/firebase/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [canViewMargin, setCanViewMargin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
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
