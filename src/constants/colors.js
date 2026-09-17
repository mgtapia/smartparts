// Tokens de color — extraídos de smartdeal.cl en producción (ver .agent/DESIGN.md).
// Única fuente de verdad de color. Prohibido hex inline en componentes.

export const COLORS = Object.freeze({
  lime: '#C5FF3E', // acento primario — la firma visual de la marca
  limeInk: '#3F5A17', // texto/ícono oscuro sobre fondo lima
  amber: '#FFC93C', // acento secundario

  ink: '#14200A', // "negro" de marca extraído del sitio real — verde-negro, no neutro.
  // No usar para superficies grandes (rail, header): en un panel extenso se lee
  // como verde musgo, no como negro. Ahí va `chrome` (negro puro) en su lugar.
  chrome: '#000000',
  inkAlt: '#101418',
  inkAlt2: '#0F1114',
  surfaceDarkAlt: '#12171B',
  surfaceDarkAlt2: '#1B2229',

  textPrimary: '#333333',
  textSecondary: '#6d6d6d',

  bg: '#FFFFFF',
  bgWarm: '#F3F4EF',
  bgAlt: '#f8f8f8',

  border: '#eeeeee',
  borderAlt: '#e5e7eb',
  borderStrong: '#d5d5d5',

  success: '#059669',
  successStrong: '#166534',
  warning: '#f97316',
  error: '#dc2626',
  errorBg: '#FFF0F0',
  infoBg: '#F0F7FF',

  mutedGreen: '#8B968A',
  mutedGreenAlt: '#B9C2B4',
})

// Radios de borde observados en el sitio real — se heredan tal cual.
export const RADIUS = Object.freeze({
  pill: 999,
  card: 14,
  cardLarge: 16,
  input: 8,
  inputSmall: 6,
})

// Tipografía — Inter confirmada en el sitio real (rango de pesos 400-900).
// Roboto Mono para códigos OEM/montos/IDs — no tiene equivalente en el sitio
// de retail, se agrega porque el dominio tabular lo exige (ver .agent/DESIGN.md).
export const FONT_BODY = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
export const FONT_DISPLAY = FONT_BODY
export const FONT_MONO = '"Roboto Mono", ui-monospace, monospace'
