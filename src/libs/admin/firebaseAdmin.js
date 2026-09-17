// Firebase Admin — SOLO se importa desde app/api/** o scripts/ (ver CLAUDE.md
// §Backend propio y .agent/WORKFLOW.md §Gotchas). Importarlo en un componente
// cliente rompe el build porque firebase-admin usa APIs de Node.
//
// Inicialización perezosa a propósito: importar este módulo no debe explotar
// si las credenciales todavía no existen (ver .agent/STATUS.md §Bloqueos) —
// solo explota cuando alguien realmente intenta usar Admin sin configurarlo.
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

let cachedApp = null

function buildCredential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin sin credenciales — faltan FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY en .env.local (ver .env.local.example).',
    )
  }
  return cert({ projectId, clientEmail, privateKey })
}

function getAdminApp() {
  if (cachedApp) return cachedApp
  const existing = getApps()
  cachedApp = existing.length ? existing[0] : initializeApp({ credential: buildCredential() })
  return cachedApp
}

export function getAdminDb() {
  return getFirestore(getAdminApp())
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}
