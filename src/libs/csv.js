// Exportar una tabla a CSV: sin dependencias, solo RFC 4180 básico (coma, comillas si hace
// falta) y descarga por el navegador. `downloadCsv` solo funciona en cliente (usa `document`).

/** @param {unknown} value */
function escapeCell(value) {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * @param {string[]} headers
 * @param {unknown[][]} rows
 * @returns {string}
 */
export function rowsToCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','))
  return lines.join('\r\n')
}

/**
 * Arma el CSV y dispara su descarga. BOM UTF-8 al inicio para que Excel muestre bien las tildes.
 * @param {string} filename
 * @param {string[]} headers
 * @param {unknown[][]} rows
 */
export function downloadCsv(filename, headers, rows) {
  const csv = rowsToCsv(headers, rows)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
