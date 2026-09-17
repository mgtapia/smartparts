// Firebase (cliente) — único punto de inicialización de la app.
// Solo credenciales NEXT_PUBLIC_ (seguras de exponer al browser). El SDK de
// Admin es una capa aparte, ver src/libs/admin/ (nunca se importa acá).
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// `getApps()` evita reinicializar en cada hot-reload de Next.js en dev.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const db = getFirestore(firebaseApp)
export const auth = getAuth(firebaseApp)
export const googleProvider = new GoogleAuthProvider()
