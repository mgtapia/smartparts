// Hook PostToolUse (Edit|Write): hace cumplir convenciones de SmartParts.
// Lee el payload de Claude Code por stdin, inspecciona el archivo editado y
// bloquea (exit 2) si rompe reglas no-negociables (ver CLAUDE.md).
import fs from 'fs'

let input = ''
process.stdin.on('data', (d) => (input += d))
process.stdin.on('end', () => {
  let fp = ''
  try {
    fp = JSON.parse(input)?.tool_input?.file_path || ''
  } catch {
    process.exit(0)
  }
  if (!fp) process.exit(0)
  const norm = fp.replace(/\\/g, '/')

  let txt = ''
  try {
    txt = fs.readFileSync(fp, 'utf8')
  } catch {
    process.exit(0)
  }

  const issues = []

  // --- Reglas de dinero (aplican a TODO el código fuente, no solo vistas) ---
  const isSource = /\.(js|jsx)$/.test(norm) && !/\.test\.js$/.test(norm)
  const isMoneyCore = /\/src\/libs\/money\.js$|\/src\/libs\/fx\.js$|\/src\/core\/costing\//.test(norm)
  const isConstants = /\/src\/constants\//.test(norm)

  if (isSource && !isMoneyCore && !isConstants) {
    // Tasa fiscal hardcodeada: 0.19, 1.19, 0.06, 19/100, etc.
    if (/\b(0\.0[1-9]|0\.[1-9]\d?|1\.[01]\d)\b/.test(txt) && /(iva|vat|arancel|duty|tax|tasa)/i.test(txt)) {
      issues.push(
        'Posible tasa fiscal hardcodeada fuera de src/constants/ o src/core/costing/. Las tasas vienen de cost_param_sets, siempre versionadas.',
      )
    }
    // Literal decimal asignado a una variable de dinero: aritmética con floats.
    const moneyFloatAssign = /\b(\w*(?:price|cost|amount|total|fee|freight)\w*)\s*=\s*\d+\.\d+/i
    const m1 = txt.match(moneyFloatAssign)
    if (m1) {
      issues.push(
        `Literal decimal asignado a "${m1[1]}": posible aritmética de dinero con floats. Los importes son Money entero — ver src/libs/money.js.`,
      )
    }
  }

  // --- Reglas de vistas/componentes (no constantes, no tests) ---
  const inScope = /(^|\/)(app|src\/(components|features))\/.*\.(js|jsx)$/.test(norm)
  const exempt = /ContentWidth\.js$|\/constants\//.test(norm)
  if (inScope && !exempt) {
    // Ancho de página inline.
    if (/maxWidth:\s*\d{3,4}\b/.test(txt) && !/ContentWidth/.test(txt)) {
      issues.push('Ancho de página inline prohibido. Usá <ContentWidth> / MAX_WIDTH de @constants/layout.')
    }
    // Naming: componentes/funciones en INGLÉS (el texto de UI sí va en español).
    const SPANISH = 'Ficha|Catalogo|Catálogo|Repuesto|Cotizacion|Cotización|Proveedor|Embarque|Costeo|Cliente|Precio|Vista|Tarjeta|Boton|Botón|Encabezado|Cabecera'
    const decl = new RegExp(`(?:function\\s+|const\\s+)(${SPANISH})\\b`)
    const m2 = txt.match(decl)
    if (m2) {
      issues.push(
        `Componente/función con nombre en español: "${m2[1]}". Renombrá a inglés (p.ej. Ficha→Detail, Cotización→QuoteView).`,
      )
    }
    // Hex inline.
    if (/#[0-9a-fA-F]{3,8}\b/.test(txt)) {
      issues.push('Hex inline prohibido. Usá tokens de @constants/colors.')
    }
  }

  if (issues.length) {
    console.error('⛔ Convenciones SmartParts — ' + norm + '\n- ' + issues.join('\n- '))
    process.exit(2) // bloquea y devuelve el mensaje a Claude
  }
  process.exit(0)
})
