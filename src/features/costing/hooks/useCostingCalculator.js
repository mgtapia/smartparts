import { useMemo, useState, useEffect } from 'react'
import { listParts } from '@libs/repos/partsRepo'
import { computeCosting } from '@core/costing/engine'
import { money } from '@libs/money'
import { DEFAULT_PARAM_SET, DEFAULT_FX } from '@mocks/costParams'
import { SHIPPING_MODES } from '@constants/enums'

// Referencia SOLO para sugerir un punto de partida en el campo de flete de la
// UI — el motor nunca la usa internamente (ver docs/MOTOR-DE-COSTOS.md §El
// flete no se inventa). El usuario la pisa con la cotización real del forwarder.
const REF_SEA_LCL_USD_PER_CBM = 180
const REF_AIR_USD_PER_KG = 6

function suggestFreightUsd(mode, totalWeightG, totalVolumeCm3) {
  if (mode === SHIPPING_MODES.AIR || mode === SHIPPING_MODES.COURIER) {
    return Math.round((totalWeightG / 1000) * REF_AIR_USD_PER_KG)
  }
  const cbm = totalVolumeCm3 / 1_000_000
  return Math.round(cbm * REF_SEA_LCL_USD_PER_CBM)
}

const DEFAULT_TIER_QUANTITIES = [10, 50, 100]

export function useCostingCalculator(initialPartId) {
  const partsWithQuotes = useMemo(() => listParts().filter((p) => p.quotes.length > 0), [])

  const [partId, setPartId] = useState(initialPartId || partsWithQuotes[0]?.id || null)
  const part = useMemo(
    () => partsWithQuotes.find((p) => p.id === partId) || null,
    [partsWithQuotes, partId],
  )

  const [quoteId, setQuoteId] = useState(part?.quotes[0]?.id || null)
  const [mode, setMode] = useState(SHIPPING_MODES.SEA_LCL)
  const [marginBp, setMarginBp] = useState(3500) // 35% por defecto — ajustable.
  const [tierFreightUsd, setTierFreightUsd] = useState({})

  useEffect(() => {
    setQuoteId(part?.quotes[0]?.id || null)
  }, [part])

  const quote = useMemo(() => part?.quotes.find((q) => q.id === quoteId) || null, [part, quoteId])

  const tiers = useMemo(() => {
    if (!part || !quote) return []
    return DEFAULT_TIER_QUANTITIES.map((qty) => {
      const suggested = suggestFreightUsd(mode, part.weightG * qty, part.volumeCm3 * qty)
      const freightUsd = tierFreightUsd[qty] ?? suggested

      const result = computeCosting({
        mode,
        lines: [
          {
            lineId: 'L1',
            qty,
            unitFob: money(Math.round(quote.unitPriceUsd * 100), 'USD'),
            grossWeightG: part.weightG * qty,
            volumeCm3: part.volumeCm3 * qty,
            originCert: 'none',
          },
        ],
        freightQuote: money(freightUsd * 100, 'USD'),
        params: DEFAULT_PARAM_SET,
        fx: DEFAULT_FX,
      })

      const line = result.lines[0]
      const unitLandedNetUsd = line.unitLandedNetMicro / 1e6
      const unitSalePriceUsd = unitLandedNetUsd * (1 + marginBp / 10000)

      return {
        qty,
        freightUsd,
        suggestedFreightUsd: suggested,
        result,
        blocked: line.blocked,
        blockReasons: line.blockReasons,
        unitLandedNetUsd,
        unitSalePriceUsd,
        totalSalePriceUsd: unitSalePriceUsd * qty,
        marginUsdPerUnit: unitSalePriceUsd - unitLandedNetUsd,
      }
    })
  }, [part, quote, mode, marginBp, tierFreightUsd])

  function setFreightForTier(qty, valueUsd) {
    setTierFreightUsd((prev) => ({ ...prev, [qty]: valueUsd }))
  }

  return {
    partsWithQuotes,
    part,
    partId,
    setPartId,
    quote,
    quoteId,
    setQuoteId,
    mode,
    setMode,
    marginBp,
    setMarginBp,
    tiers,
    setFreightForTier,
  }
}
