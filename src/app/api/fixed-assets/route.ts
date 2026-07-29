// ============================================================
// API: Fixed Assets Register + Auto-Depreciation
// GET  /api/fixed-assets
// POST /api/fixed-assets  — add asset
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adToBsString, bsStringToAd, isValidBsDate, parseBsDate, getFiscalYear } from '@/lib/nepaliCalendar'
import { DEPRECIATION_RATES } from '@/lib/taxEngine'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET() {
  const assets = await db.fixedAsset.findMany({
    where: { tenantId: DEMO_TENANT_ID },
    orderBy: { assetCode: 'asc' },
  })

  // Compute current depreciation and book value based on time elapsed
  const today = new Date()
  const fy = getFiscalYear(today)

  const assetsWithDep = assets.map(a => {
    const cost = Number(a.cost)
    const salvage = Number(a.salvageValue)
    const depRate = Number(a.depRate)
    const acqDate = new Date(a.acquisitionAdDate)
    const fyStart = fy.startAd

    // Days elapsed from acquisition to FY end (or today, whichever is earlier)
    const referenceDate = today < fy.endAd ? today : fy.endAd
    const daysElapsed = Math.max(0, Math.floor((referenceDate.getTime() - acqDate.getTime()) / (1000 * 60 * 60 * 24)))
    const yearsElapsed = daysElapsed / 365.25

    // Compute depreciation based on method
    let computedDepreciation = 0
    if (a.depMethod === 'SLM') {
      // Straight-line: (cost - salvage) * rate% * yearsElapsed
      computedDepreciation = (cost - salvage) * (depRate / 100) * yearsElapsed
    } else {
      // WDV (Written Down Value): cost * (1 - rate)^years - cost, negated
      // For each year, depreciation = (cost - accumulated) * rate%
      let bookValue = cost
      const fullYears = Math.floor(yearsElapsed)
      for (let i = 0; i < fullYears; i++) {
        const yearDep = bookValue * (depRate / 100)
        computedDepreciation += yearDep
        bookValue -= yearDep
      }
      // Pro-rata for partial year
      const partialYear = yearsElapsed - fullYears
      if (partialYear > 0) {
        computedDepreciation += bookValue * (depRate / 100) * partialYear
      }
    }
    computedDepreciation = Math.min(computedDepreciation, cost - salvage)
    computedDepreciation = Math.max(0, computedDepreciation)

    // FY depreciation (this fiscal year)
    let fyDepreciation = 0
    const fyYears = Math.min(1, Math.max(0, yearsElapsed))
    if (a.depMethod === 'SLM') {
      fyDepreciation = (cost - salvage) * (depRate / 100) * Math.min(1, fyYears)
    } else {
      // Estimate FY depreciation as a pro-rata
      const bookValueStart = cost - (computedDepreciation - (cost * Math.pow(1 - depRate / 100, fullYearsElapsed(acqDate, fyStart)) * (depRate / 100)))
      fyDepreciation = bookValueStart * (depRate / 100) * Math.min(1, fyYears)
    }
    fyDepreciation = Math.max(0, fyDepreciation)

    return {
      ...a,
      cost,
      salvageValue: salvage,
      depRate,
      accumulatedDep: Number(a.accumulatedDep),
      computedDepreciation,
      fyDepreciation: Math.max(0, fyDepreciation),
      bookValue: cost - computedDepreciation,
      yearsElapsed: Number(yearsElapsed.toFixed(2)),
    }
  })

  return NextResponse.json({ assets: assetsWithDep })
}

function fullYearsElapsed(acqDate: Date, refDate: Date): number {
  const days = Math.max(0, Math.floor((refDate.getTime() - acqDate.getTime()) / (1000 * 60 * 60 * 24)))
  return Math.floor(days / 365.25)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { assetCode, name, category, acquisitionBsDate, cost, salvageValue, usefulLifeYears, depMethod, depRate, location } = body

  if (!assetCode || !name || !category || !acquisitionBsDate || !cost) {
    return NextResponse.json({ error: 'assetCode, name, category, acquisitionBsDate, cost required' }, { status: 400 })
  }

  if (!isValidBsDate(acquisitionBsDate)) {
    return NextResponse.json({ error: 'Invalid BS date' }, { status: 400 })
  }

  // Auto-fill depreciation rate from category if not specified
  const catDef = DEPRECIATION_RATES[category]
  const effectiveRate = depRate ?? catDef?.rate ?? 15
  const effectiveMethod = depMethod ?? catDef?.method ?? 'WDV'
  const effectiveLife = usefulLifeYears ?? Math.ceil(100 / effectiveRate)

  const adDate = bsStringToAd(acquisitionBsDate)

  const created = await db.fixedAsset.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      assetCode,
      name,
      category,
      acquisitionBsDate,
      acquisitionAdDate: adDate,
      cost: Number(cost),
      salvageValue: Number(salvageValue || 0),
      usefulLifeYears: Number(effectiveLife),
      depMethod: effectiveMethod,
      depRate: Number(effectiveRate),
      accumulatedDep: 0,
      location,
      status: 'ACTIVE',
    },
  })

  return NextResponse.json({ asset: created })
}
