// ============================================================
// API: Post Depreciation for current FY
// Creates a voucher: Dr. Depreciation Expense / Cr. Accumulated Depreciation
// for each active fixed asset
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adToBsString, getFiscalYear } from '@/lib/nepaliCalendar'
import { DEPRECIATION_RATES } from '@/lib/taxEngine'

const DEMO_TENANT_ID = 'demo-tenant'

function fullYearsElapsed(acqDate: Date, refDate: Date): number {
  const days = Math.max(0, Math.floor((refDate.getTime() - acqDate.getTime()) / (1000 * 60 * 60 * 24)))
  return Math.floor(days / 365.25)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { asOfBsDate } = body

  const today = new Date()
  const fy = getFiscalYear(today)

  const assets = await db.fixedAsset.findMany({
    where: { tenantId: DEMO_TENANT_ID, status: 'ACTIVE' },
  })

  // Find depreciation accounts
  const depExpenseAcc = await db.account.findFirst({
    where: { tenantId: DEMO_TENANT_ID, code: '5114' }, // Depreciation
  })
  const accDepAcc = await db.account.findFirst({
    where: { tenantId: DEMO_TENANT_ID, code: '1107' }, // Accumulated Depreciation
  })

  if (!depExpenseAcc || !accDepAcc) {
    return NextResponse.json({ error: 'Depreciation accounts (5114, 1107) not found in chart of accounts' }, { status: 400 })
  }

  const fiscalYear = await db.fiscalYear.findFirst({
    where: { tenantId: DEMO_TENANT_ID, bsYearStart: fy.bsYearStart },
  })

  const bsDate = asOfBsDate || adToBsString(today)
  const datePart = bsDate.replace(/-/g, '')
  const existing = await db.voucher.count({
    where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `JV-DEP-${datePart}` } },
  })
  const voucherNo = `JV-DEP-${datePart}-${String(existing + 1).padStart(3, '0')}`

  // Compute depreciation for each asset for this fiscal year
  let totalDepreciation = 0
  const lines: Array<{ description: string; debit: number; credit: number }> = []

  for (const asset of assets) {
    const cost = Number(asset.cost)
    const salvage = Number(asset.salvageValue)
    const rate = Number(asset.depRate)
    const acqDate = new Date(asset.acquisitionAdDate)
    const fyStart = fy.startAd

    // Years elapsed at FY start (for opening book value)
    const yearsAtFyStart = fullYearsElapsed(acqDate, fyStart)

    let bookValueAtFyStart = cost
    if (asset.depMethod === 'SLM') {
      bookValueAtFyStart = cost - Math.min(cost - salvage, (cost - salvage) * (rate / 100) * yearsAtFyStart)
    } else {
      // WDV
      bookValueAtFyStart = cost * Math.pow(1 - rate / 100, yearsAtFyStart)
    }
    bookValueAtFyStart = Math.max(salvage, bookValueAtFyStart)

    // FY depreciation = bookValueAtFyStart * rate% (assuming full year; could pro-rata)
    const fyDep = Math.min(bookValueAtFyStart - salvage, bookValueAtFyStart * (rate / 100))
    if (fyDep > 0) {
      totalDepreciation += fyDep
      lines.push({
        description: `Depreciation — ${asset.name} (${asset.assetCode}) @ ${rate}% ${asset.depMethod}`,
        debit: fyDep,
        credit: 0,
      })

      // Update accumulated depreciation on the asset
      await db.fixedAsset.update({
        where: { id: asset.id },
        data: {
          accumulatedDep: Number(asset.accumulatedDep) + fyDep,
        },
      })
    }
  }

  if (totalDepreciation === 0) {
    return NextResponse.json({ message: 'No depreciation to post — no active assets with positive book value', posted: false })
  }

  // Add credit line for total accumulated depreciation
  lines.push({
    description: 'Accumulated Depreciation — Total for FY',
    debit: 0,
    credit: totalDepreciation,
  })

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0)

  // Create voucher with all depreciation lines
  const voucher = await db.voucher.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      fiscalYearId: fiscalYear?.id,
      voucherNo,
      voucherType: 'JOURNAL',
      bsDate,
      adDate: today,
      narration: `Auto-posted depreciation for FY ${fy.label} — ${assets.length} assets`,
      totalDebit,
      totalCredit,
      status: 'POSTED',
      lines: {
        create: lines.map(l => ({
          accountId: l.debit > 0 ? depExpenseAcc.id : accDepAcc.id,
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        })),
      },
    },
  })

  return NextResponse.json({
    posted: true,
    voucherNo: voucher.voucherNo,
    assetsProcessed: assets.length,
    totalDepreciation,
  })
}
