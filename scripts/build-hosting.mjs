#!/usr/bin/env node
// Genera el sitio estático que se publica en Firebase Hosting, en `out/`.
// Uso: npm run build:hosting   y luego   firebase deploy --only hosting
import { spawnSync } from 'node:child_process'

const result = spawnSync('npx', ['next', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NEXT_OUTPUT: 'export', NEXT_DIST_DIR: 'out' },
})
process.exit(result.status ?? 1)
