#!/usr/bin/env node
// Asigna custom claims (role/canViewMargin) a un usuario de Firebase Auth por
// email — ver docs/SEGURIDAD-Y-ROLES.md. Si el usuario todavía no inició
// sesión ni una vez, se crea el registro en Auth igual: cuando entre con
// Google usando el mismo email, Firebase lo vincula solo.
//
// Uso: node scripts/set-user-role.mjs <email> <role> [--margin]
//   node scripts/set-user-role.mjs matiastapia91@gmail.com admin --margin

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvLocal()

const [, , email, role, ...flags] = process.argv
if (!email || !role) {
  console.error('Uso: node scripts/set-user-role.mjs <email> <role> [--margin]')
  process.exit(1)
}
const canViewMargin = flags.includes('--margin')

const { getAdminAuth } = await import('../src/libs/admin/firebaseAdmin.js')

async function main() {
  const auth = getAdminAuth()
  let user
  try {
    user = await auth.getUserByEmail(email)
  } catch {
    user = await auth.createUser({ email })
    console.log(`  usuario creado en Firebase Auth (se vincula solo cuando entre con Google).`)
  }
  await auth.setCustomUserClaims(user.uid, { role, canViewMargin })
  console.log(`✔ ${email} → role=${role}, canViewMargin=${canViewMargin} (uid=${user.uid})`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✖ Falló:', err.message)
    process.exit(1)
  })
