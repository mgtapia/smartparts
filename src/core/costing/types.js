// Typedefs JSDoc compartidos del motor de costos.
// Contrato entre el motor, la UI y la persistencia (costing_scenarios, shipments).
// Ver docs/MOTOR-DE-COSTOS.md para la explicación completa de cada campo.

/**
 * @typedef {'sea_lcl'|'sea_fcl_20'|'sea_fcl_40hq'|'air'|'courier'} ShippingMode
 */

/**
 * @typedef {Object} DgAirTransport
 * @property {boolean} allowed
 * @property {boolean} [cargoAircraftOnly]
 * @property {string} [reasonCode]
 * @property {string} [reasonNote]
 */

/**
 * @typedef {Object} DgSeaTransport
 * @property {boolean} allowed
 * @property {boolean} [lclAccepted]
 * @property {string} [note]
 */

/**
 * @typedef {Object} DgProfile
 * @property {string} unNumber              'UN3480'
 * @property {string} hazardClass           '9'
 * @property {{status: 'provided'|'missing'|'pending'}} un383
 * @property {DgAirTransport} airTransport
 * @property {DgSeaTransport} seaTransport
 */

/**
 * @typedef {Object} CostingLineInput
 * @property {string} lineId              ID estable de la línea (partId o lineId de shipment).
 * @property {string} [partId]
 * @property {number} qty                 Cantidad de unidades.
 * @property {import('../../libs/money').Money} unitFob   Precio unitario FOB.
 * @property {number} grossWeightG        Peso bruto TOTAL de la línea, en gramos enteros.
 * @property {number} volumeCm3           Volumen TOTAL de la línea, en cm³ enteros.
 * @property {'form_f'|'none'|'pending'} originCert
 * @property {string} [hsCode]
 * @property {DgProfile} [dgProfile]
 */

/**
 * @typedef {Object} DutyRateOverride
 * @property {number} generalBp
 * @property {number} [ftaBp]
 */

/**
 * @typedef {Object} CostParamSet
 * @property {string} id
 * @property {Object} duty
 * @property {number} duty.generalAdValoremBp
 * @property {Record<string, DutyRateOverride>} [duty.rateOverridesByHs]
 * @property {Object} vat
 * @property {number} vat.rateBp
 * @property {Object} insurance
 * @property {number} insurance.rateBp
 * @property {number} insurance.markupBp
 * @property {import('../../libs/money').Money} insurance.minPremium
 * @property {Object} freightDefaults
 * @property {number} freightDefaults.airVolumetricDivisor
 * @property {number} freightDefaults.seaLclWmKgPerCbm
 * @property {number} freightDefaults.seaLclMinRevenueTonsX1000
 * @property {Object} freightDefaults.referenceRates
 * @property {LocalCostConcept[]} localCosts
 * @property {DgSurcharge[]} [dgSurcharges]
 * @property {Object} thresholds
 * @property {import('../../libs/money').Money} thresholds.dinRequiredFobUsd
 * @property {import('../../libs/money').Money} thresholds.courierSimplifiedMaxFobUsd
 * @property {Object} rounding
 * @property {'half_up'} rounding.moneyMode
 * @property {'largest_remainder'} rounding.allocationMethod
 */

/**
 * @typedef {Object} LocalCostConcept
 * @property {string} code
 * @property {string} labelEs
 * @property {'fixed'|'percent'|'percent_with_min'|'fixed_per_unit'} type
 * @property {import('../../libs/money').Money} [amount]
 * @property {number} [rateBp]
 * @property {import('../../libs/money').Money} [min]
 * @property {'by_cif_value'|'by_fob_value'|'by_chargeable_units'|'by_volume'|'equal_split'|'direct'} allocation
 * @property {ShippingMode[]} [appliesToModes]
 */

/**
 * @typedef {Object} DgSurcharge
 * @property {string} code
 * @property {string} labelEs
 * @property {'fixed'|'fixed_plus_per_kg'|'percent_uplift_on_insurance'} type
 * @property {import('../../libs/money').Money} [fixed]
 * @property {import('../../libs/money').Money} [perKg]
 * @property {number} [rateBp]
 * @property {ShippingMode[]} appliesToModes
 */

/**
 * @typedef {Object} FxSnapshot
 * @property {number} usdClp     Micros de CLP por 1 USD (entero).
 * @property {number} cnyUsd     Micros de USD por 1 CNY (entero).
 * @property {string} asOf       Fecha ISO.
 */

/**
 * @typedef {Object} CostingInput
 * @property {ShippingMode} mode
 * @property {CostingLineInput[]} lines
 * @property {import('../../libs/money').Money} freightQuote  Flete TOTAL cotizado por el forwarder
 *   para todo el embarque (no por línea). El motor lo prorratea entre líneas por unidades
 *   facturables — así el número nunca se inventa, viene siempre de una cotización real.
 * @property {CostParamSet} params
 * @property {FxSnapshot} fx
 * @property {Object} [options]
 * @property {boolean} [options.insured]              default true
 * @property {'auto'|'din'|'din_simplificada'|'courier_simplified'} [options.dinType]  default 'auto'
 * @property {number} [options.warehousingDays]        default 0
 */

/**
 * @typedef {Object} CostingLineResult
 * @property {string} lineId
 * @property {boolean} blocked               true si un blocker de DG impide costear esta línea en este modo.
 * @property {string[]} blockReasons         Vacío si blocked es false.
 * @property {'real'|'volumetric'} chargeableBasis
 * @property {number} chargeableUnitsMicro   R/T o kg, en micros (10^-6).
 * @property {import('../../libs/money').Money} fob        Todos los campos monetarios del motor
 *   se calculan y devuelven en **USD** (base de liquidación de Aduana Chile). La conversión a
 *   CLP para mostrar en la UI es un paso de presentación aparte — ver `src/libs/fx.js`.
 * @property {import('../../libs/money').Money} freight
 * @property {import('../../libs/money').Money} insurance
 * @property {import('../../libs/money').Money} cif
 * @property {import('../../libs/money').Money} duty
 * @property {import('../../libs/money').Money} vat
 * @property {import('../../libs/money').Money} localCosts
 * @property {import('../../libs/money').Money} landedNet   CIF + duty + localCosts. NO incluye IVA:
 *   si el IVA es recuperable como crédito fiscal, no es un costo real.
 * @property {import('../../libs/money').Money} cashOutlay  landedNet + vat: la plata que efectivamente
 *   sale de la cuenta al momento del despacho, se recupere o no después.
 * @property {number} unitLandedNetMicro     landedNet / qty, en micros USD redondeado a 4 decimales
 *   (100 micros = 1 centésima de centavo).
 */

/**
 * @typedef {Object} CostingTotals
 * @property {import('../../libs/money').Money} fob
 * @property {import('../../libs/money').Money} freight
 * @property {import('../../libs/money').Money} insurance
 * @property {import('../../libs/money').Money} cif
 * @property {import('../../libs/money').Money} duty
 * @property {import('../../libs/money').Money} vat
 * @property {import('../../libs/money').Money} localCosts
 * @property {import('../../libs/money').Money} landedNet
 * @property {import('../../libs/money').Money} cashOutlay
 * @property {number} upliftBp               (landedNet / fob - 1) en basis points.
 */

/**
 * @typedef {Object} CostingResult
 * @property {CostingLineResult[]} lines
 * @property {CostingTotals} totals
 * @property {string[]} warnings
 * @property {string[]} blockers            Si no está vacío, el resultado NO es utilizable.
 * @property {Object} logistics
 * @property {number} logistics.leadTimeTotalDays
 * @property {string} engineVersion
 * @property {string} paramSetId
 * @property {string} computedAt
 */

export {}
