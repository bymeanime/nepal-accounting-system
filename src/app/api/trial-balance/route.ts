// ============================================================
// API: Trial Balance
// GET /api/trial-balance?asOfBs=2083-03-15
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bsStringToAd, isValidBsDate, adToBsString, getFiscalYear } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const asOfBsParam = searchParams.get('asOfBs')
  const asOfBs = asOfBsParam && isValidBsDate(asOfBsParam) ? asOfBsParam : adToBsString(new Date())
  const asOfAd = bsStringToAd(asOfBs)

  const fy = getFiscalYear(new Date(asOfAd))

  const accounts = await db.account.findMany({
    where: { tenantId: DEMO_TENANT_ID, isGroup: false, isActive: true },
    orderBy: { code: 'asc' },
  })

  const lines: any[] = []
  let totalDebit = 0, totalCredit = 0

  for (const acc of accounts) {
    const voucherLines = await db.voucherLine.findMany({
      where: {
        accountId: acc.id,
        voucher: {
          tenantId: DEMO_TENANT_ID,
          status: 'POSTED',
          adDate: { lte: asOfAd },
        },
      },
      select: { debit: true, credit: true },
    })
    let debit = Number(acc.openingBalance)
    let credit = 0
    for (const vl of voucherLines) {
      debit += Number(vl.debit)
      credit += Number(vl.credit)
    }
    const netDebit = debit - credit
    if (Math.abs(netDebit) < 0.01 && debit === 0) continue // skip zero accounts

    // ASSET/EXPENSE = debit balance; LIABILITY/EQUITY/INCOME = credit balance
    let displayDebit = 0, displayCredit = 0
    if (netDebit >= 0) {
      displayDebit = netDebit
      totalDebit += netDebit
    } else {
      displayCredit = -netDebit
      totalCredit += -netDebit
    }

    lines.push({
      code: acc.code,
      name: acc.name,
      nameNp: acc.nameNp,
      type: acc.type,
      subType: acc.subType,
      debit: displayDebit,
      credit: displayCredit,
    })
  }

  return NextResponse.json({
    asOfBs,
    asOfAd: asOfAd.toISOString().split('T')[0],
    fiscalYear: fy.label,
    lines,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
  })
}
