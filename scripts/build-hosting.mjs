#!/usr/bin/env node
// Genera el sitio estático que se publica en Firebase Hosting, en `out/`.
// Uso: npm run build:hosting   y luego   firebase deploy --only hosting
//
// Con `output: 'export'` Next SIEMPRE compila en `.next` (distDir solo define dónde queda el
// HTML final), es decir, pisa la carpeta del servidor de desarrollo y lo rompe. Por eso la
// compilación se hace en una copia del proyecto en una carpeta temporal, con `node_modules`
// enlazado, y solo se trae de vuelta `out/`. Así no se toca nada de `.next`.
//
// Además la compilación estática falla de forma intermitente con "Cannot find module"
// (caché a medio escribir): se reintenta hasta 3 veces desde una copia limpia.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
// Mismo disco que el proyecto: con otro disco Next no resuelve las rutas de node_modules.
const WORK = path.join(path.dirname(ROOT), '.smartparts-hosting-build')
const ATTEMPTS = 3
const EXCLUDED = new Set([
  'node_modules',
  '.git',
  '.next',
  '.next-verify',
  '.next-devtest',
  'out',
  'backups',
  'coverage',
  '.claude',
])

function prepareCopy() {
  fs.rmSync(WORK, { recursive: true, force: true })
  fs.cpSync(ROOT, WORK, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(ROOT, source)
      const top = relative.split(path.sep)[0]
      return !EXCLUDED.has(top)
    },
  })
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(WORK, 'node_modules'), 'junction')
}

for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  prepareCopy()
  const result = spawnSync('npx', ['next', 'build'], {
    cwd: WORK,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NEXT_OUTPUT: 'export', NEXT_DIST_DIR: 'out' },
  })
  if (result.status === 0 && fs.existsSync(path.join(WORK, 'out', 'index.html'))) {
    fs.rmSync(path.join(ROOT, 'out'), { recursive: true, force: true })
    fs.cpSync(path.join(WORK, 'out'), path.join(ROOT, 'out'), { recursive: true })
    fs.rmSync(WORK, { recursive: true, force: true })
    process.exit(0)
  }
  console.error(`\nIntento ${attempt} de ${ATTEMPTS} fallido.`)
}
process.exit(1)
