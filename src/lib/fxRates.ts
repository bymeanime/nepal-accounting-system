// ============================================================
// NRB (Nepal Rastra Bank) Foreign Exchange Rate fetcher
// NRB publishes daily FX rates at https://www.nrb.org.np/apiforex/api/v1/fxrates
// We use this to populate exchange rates for multi-currency transactions.
// ============================================================

interface NrbFxRate {
  currency: string
  currencyName: string
  buy: number
  sell: number
  unit: number  // units per currency (e.g., 1 USD = 1 unit, 1 INR = 100 units)
  date: string  // YYYY-MM-DD
}

// Fallback static rates (approximate, for sandbox without internet)
const FALLBACK_RATES: NrbFxRate[] = [
  { currency: 'USD', currencyName: 'US Dollar', buy: 132.5, sell: 133.2, unit: 1, date: '2026-07-26' },
  { currency: 'EUR', currencyName: 'Euro', buy: 143.8, sell: 144.6, unit: 1, date: '2026-07-26' },
  { currency: 'GBP', currencyName: 'British Pound', buy: 168.4, sell: 169.2, unit: 1, date: '2026-07-26' },
  { currency: 'INR', currencyName: 'Indian Rupee', buy: 1.60, sell: 1.602, unit: 100, date: '2026-07-26' },
  { currency: 'CHF', currencyName: 'Swiss Franc', buy: 147.2, sell: 148.0, unit: 1, date: '2026-07-26' },
  { currency: 'AUD', currencyName: 'Australian Dollar', buy: 87.4, sell: 88.0, unit: 1, date: '2026-07-26' },
  { currency: 'CAD', currencyName: 'Canadian Dollar', buy: 96.8, sell: 97.4, unit: 1, date: '2026-07-26' },
  { currency: 'CNY', currencyName: 'Chinese Yuan', buy: 18.5, sell: 18.6, unit: 1, date: '2026-07-26' },
  { currency: 'JPY', currencyName: 'Japanese Yen', buy: 0.88, sell: 0.885, unit: 100, date: '2026-07-26' },
  { currency: 'SGD', currencyName: 'Singapore Dollar', buy: 98.5, sell: 99.0, unit: 1, date: '2026-07-26' },
  { currency: 'AED', currencyName: 'UAE Dirham', buy: 36.1, sell: 36.3, unit: 1, date: '2026-07-26' },
  { currency: 'MYR', currencyName: 'Malaysian Ringgit', buy: 30.2, sell: 30.4, unit: 1, date: '2026-07-26' },
]

/**
 * Fetch the latest NRB FX rates.
 * Falls back to static rates if the API is unreachable.
 */
export async function fetchNrbFxRates(): Promise<NrbFxRate[]> {
  // Try NRB official API
  try {
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const url = `https://www.nrb.org.np/apiforex/api/v1/fxrates?from=${todayStr}&to=${todayStr}&per_page=1&page=1`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    })
    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      if (data?.data?.payload && Array.isArray(data.data.payload) && data.data.payload.length > 0) {
        const ratesRecord = data.data.payload[0]
        const rates: NrbFxRate[] = []
        for (const [code, info] of Object.entries(ratesRecord.rates || {})) {
          const r = info as any
          rates.push({
            currency: code,
            currencyName: r.name,
            buy: Number(r.buy),
            sell: Number(r.sell),
            unit: Number(r.unit),
            date: todayStr,
          })
        }
        if (rates.length > 0) return rates
      }
    }
  } catch (err) {
    console.warn('NRB API unreachable, using fallback rates:', (err as Error).message)
  }
  return FALLBACK_RATES
}

/**
 * Convert an amount from foreign currency to NPR using NRB rates.
 */
export function convertToNpr(amount: number, fromCurrency: string, rate: NrbFxRate): number {
  if (fromCurrency === 'NPR' || rate.unit === 0) return amount
  // rate.buy is NPR per `unit` units of foreign currency
  const nprPerUnit = rate.buy / rate.unit
  return amount * nprPerUnit
}

/**
 * Convert NPR amount to foreign currency using NRB rates.
 */
export function convertFromNpr(nprAmount: number, toCurrency: string, rate: NrbFxRate): number {
  if (toCurrency === 'NPR' || rate.unit === 0) return nprAmount
  const nprPerUnit = rate.sell / rate.unit
  return nprAmount / nprPerUnit
}
