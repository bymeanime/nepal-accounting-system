// ============================================================
// API: Foreign Exchange Rates (NRB)
// GET /api/fx-rates — fetch latest NRB FX rates
// POST /api/fx-rates { amount, fromCurrency, toCurrency }
//   — convert amount using latest NRB rates
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { fetchNrbFxRates, convertToNpr, convertFromNpr } from '@/lib/fxRates'

export async function GET() {
  const rates = await fetchNrbFxRates()
  return NextResponse.json({
    source: 'Nepal Rastra Bank (NRB)',
    fetchedAt: new Date().toISOString(),
    baseCurrency: 'NPR',
    rates: rates.map(r => ({
      currency: r.currency,
      name: r.currencyName,
      buy: r.buy,
      sell: r.sell,
      unit: r.unit,
      nprPerUnit: r.buy / r.unit,
      date: r.date,
    })),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { amount, fromCurrency, toCurrency } = body

  if (!amount || !fromCurrency || !toCurrency) {
    return NextResponse.json({ error: 'amount, fromCurrency, toCurrency required' }, { status: 400 })
  }

  const rates = await fetchNrbFxRates()

  if (fromCurrency === toCurrency) {
    return NextResponse.json({
      amount: Number(amount),
      fromCurrency,
      toCurrency,
      rate: 1,
      convertedAmount: Number(amount),
    })
  }

  // From currency -> NPR
  let nprAmount: number
  let fromRateInfo: any
  if (fromCurrency === 'NPR') {
    nprAmount = Number(amount)
  } else {
    const fromRate = rates.find(r => r.currency === fromCurrency)
    if (!fromRate) return NextResponse.json({ error: `Unknown currency: ${fromCurrency}` }, { status: 400 })
    fromRateInfo = { currency: fromRate.currency, buy: fromRate.buy, unit: fromRate.unit, nprPerUnit: fromRate.buy / fromRate.unit }
    nprAmount = convertToNpr(Number(amount), fromCurrency, fromRate)
  }

  // NPR -> To currency
  let convertedAmount: number
  let toRateInfo: any
  let rate = 1
  if (toCurrency === 'NPR') {
    convertedAmount = nprAmount
    rate = nprAmount / Number(amount)
  } else {
    const toRate = rates.find(r => r.currency === toCurrency)
    if (!toRate) return NextResponse.json({ error: `Unknown currency: ${toCurrency}` }, { status: 400 })
    toRateInfo = { currency: toRate.currency, sell: toRate.sell, unit: toRate.unit, nprPerUnit: toRate.sell / toRate.unit }
    convertedAmount = convertFromNpr(nprAmount, toCurrency, toRate)
    rate = convertedAmount / Number(amount)
  }

  return NextResponse.json({
    amount: Number(amount),
    fromCurrency,
    toCurrency,
    fromRate: fromRateInfo,
    toRate: toRateInfo,
    rate,
    convertedAmount,
    nprEquivalent: nprAmount,
    fetchedAt: new Date().toISOString(),
  })
}
