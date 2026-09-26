// PreToolUse (Bash): hace cumplir las reglas de git de `.agent/WORKFLOW.md` §Git. Bloquea (exit 2,
// el motivo le llega al agente) lo que rompe el flujo profesional: commitear en `main`, subir a la
// fuerza, saltarse los hooks, agregar archivos a ciegas y los comandos que borran trabajo.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

let command = ''
try {
  command = JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.command ?? ''
} catch {
  process.exit(0)
}

// Un mensaje de commit puede nombrar lo prohibido ("…se usaba git add -A…"): se evalúa la orden sin
// el texto entre comillas ni el de los heredocs.
const bare = command
  .replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\s*\1\b/g, '')
  .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""')
if (!/\bgit\b/.test(bare)) process.exit(0)

let branch = ''
try {
  branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim()
} catch {
  process.exit(0)
}

const has = (re) => re.test(bare)
const rules = [
  [
    has(/\bgit\s+commit\b/) && ['main', 'master'].includes(branch),
    'Estás en `main`: no se commitea ahí. Crea una rama (`git switch -c feature/<tema>`, `fix/<tema>`, `docs/<tema>` o `chore/<tema>`) y commitea en ella; `main` solo recibe fusiones con `--no-ff`.',
  ],
  [
    has(/\bgit\s+push\b[^\n;&|]*(--force\b|--force-with-lease\b|\s-f\b)/),
    'Nada de `push --force`: reescribe la historia compartida. Si de verdad hace falta, lo hace el usuario a mano.',
  ],
  [
    has(/--no-verify\b|--no-gpg-sign\b/),
    'No se saltan los hooks ni la firma. Arregla la causa del fallo.',
  ],
  [
    has(/\bgit\s+add\s+(-A\b|--all\b|\.(\s|$)|-u\b)/),
    'No agregues a ciegas (`git add -A` / `.`): puede colar archivos de trabajo, planillas o formato masivo. Agrega los archivos por nombre y revisa `git status` y `git diff --stat` antes.',
  ],
  [
    has(/\bgit\s+(reset\s+--hard|clean\s+-\w*f|checkout\s+--\s+\.|restore\s+\.|branch\s+-D\b)/),
    'Comando que borra trabajo sin volver atrás. Confirma primero con el usuario y usa la opción segura (`git branch -d` solo borra ramas ya fusionadas).',
  ],
]

for (const [broken, message] of rules) {
  if (broken) {
    console.error(`Regla de git (.agent/WORKFLOW.md §Git): ${message}`)
    process.exit(2)
  }
}
