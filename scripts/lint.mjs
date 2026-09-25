#!/usr/bin/env node
// `next lint` escribe su caché y tipos dentro de la carpeta de compilación (`.next`), que es la
// del servidor de desarrollo: ejecutarlo mientras `yarn dev` corre corrompe su compilación en
// caliente. Acá se usa otra carpeta, así el lint nunca toca la del servidor.
import { spawnSync } from 'node:child_process'

const result = spawnSync('npx', ['next', 'lint', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NEXT_DIST_DIR: '.next-verify' },
})
process.exit(result.status ?? 1)
