#!/usr/bin/env node
// Genera el sitio estático que se publica en Firebase Hosting, en `out/`.
// Uso: npm run build:hosting   y luego   firebase deploy --only hosting
//
// La compilación estática falla de forma intermitente con "Cannot find module" (caché
// de compilación a medio escribir): se limpia `out/` y se reintenta hasta 3 veces.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const ATTEMPTS = 3

for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  fs.rmSync('out', { recursive: true, force: true })
  const result = spawnSync('npx', ['next', 'build'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NEXT_OUTPUT: 'export', NEXT_DIST_DIR: 'out' },
  })
  if (result.status === 0 && fs.existsSync('out/index.html')) process.exit(0)
  console.error(`\nIntento ${attempt} de ${ATTEMPTS} fallido.`)
}
process.exit(1)
