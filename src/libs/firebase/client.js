// Firebase (cliente) — único punto de inicialización de la app.
// Solo credenciales NEXT_PUBLIC_ (seguras de exponer al browser). El SDK de
// Admin es una capa aparte, ver src/libs/admin/ (nunca se importa acá).
//
// Getters perezosos a propósito (igual que src/libs/admin/firebaseAdmin.js):
// importar este módulo no debe inicializar nada — así los repos se pueden
// importar en Vitest (entorno Node sin las env vars de Next.js cargadas) sin
// que reviente por una app key ausente, mientras la función que de verdad
// hace I/O no se llame.
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

let cachedApp = null
function getFirebaseApp() {
  // `getApps()` evita reinicializar en cada hot-reload de Next.js en dev.
  if (!cachedApp) cachedApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return cachedApp
}

let cachedDb = null
export function getDb() {
  if (!cachedDb) cachedDb = getFirestore(getFirebaseApp())
  return cachedDb
}

let cachedAuth = null
export function getFirebaseAuth() {
  if (!cachedAuth) cachedAuth = getAuth(getFirebaseApp())
  return cachedAuth
}

let cachedProvider = null
export function getGoogleProvider() {
  if (!cachedProvider) cachedProvider = new GoogleAuthProvider()
  return cachedProvider
}
