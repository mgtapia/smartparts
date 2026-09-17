// Repository ligero — Fase 1 lee de src/mocks/ (ver .agent/ARCHITECTURE.md §4).
import { QUOTES, listQuotesByPart as listQuotesByPartMock, getQuote } from '@mocks/quotes'
import { getSupplier } from '@mocks/suppliers'

function withSupplier(q) {
  return { ...q, supplier: getSupplier(q.supplierId) }
}

export function listQuotes() {
  return QUOTES.map(withSupplier)
}

export function listQuotesByPart(partId) {
  return listQuotesByPartMock(partId).map(withSupplier)
}

export function isQuoteExpiringSoon(quote, withinDays = 7, today = new Date()) {
  const validUntil = new Date(quote.validUntil)
  const diffDays = (validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= withinDays
}

export { getQuote }
