// ============================================================
// API: Balance Sheet (Schedule V Nepal format)
// GET /api/balance-sheet?asOfBs=2083-03-15
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

  async function sumAccountsByType(accountType: string, subTypes?: string[]): Promise<{ accounts: any[]; total: number }> {
    const where: any = { tenantId: DEMO_TENANT_ID, type: accountType, isGroup: false, isActive: true }
    if (subTypes && subTypes.length > 0) where.subType = { in: subTypes }

    const accounts = await db.account.findMany({ where, orderBy: { code: 'asc' } })
    const result: any[] = []
    let total = 0
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
      let debit = Number(acc.openingBalance), credit = 0
      for (const vl of voucherLines) {
        debit += Number(vl.debit)
        credit += Number(vl.credit)
      }
      // For ASSET: debit balance; for LIABILITY/EQUITY: credit balance
      let balance: number
      if (accountType === 'ASSET') {
        balance = debit - credit
      } else {
        balance = credit - debit
      }
      if (Math.abs(balance) < 0.01) continue
      result.push({
        code: acc.code,
        name: acc.name,
        nameNp: acc.nameNp,
        subType: acc.subType,
        balance,
      })
      total += balance
    }
    return { accounts: result, total }
  }

  const currentAssets = await sumAccountsByType('ASSET', ['CURRENT_ASSET'])
  const fixedAssets = await sumAccountsByType('ASSET', ['FIXED_ASSET'])
  const nonCurrentAssets = await sumAccountsByType('ASSET', ['NON_CURRENT_ASSET'])

  const currentLiabilities = await sumAccountsByType('LIABILITY', ['CURRENT_LIABILITY'])
  const longTermLiabilities = await sumAccountsByType('LIABILITY', ['LONG_TERM_LIABILITY'])

  const equity = await sumAccountsByType('EQUITY')

  const totalAssets = currentAssets.total + fixedAssets.total + nonCurrentAssets.total
  const totalLiabilities = currentLiabilities.total + longTermLiabilities.total
  const totalEquity = equity.total

  // For balance: Assets = Liabilities + Equity
  // If not balanced, the difference is current period profit/loss (Retained Earnings adjustment)
  const retainedEarningsAdjustment = totalAssets - (totalLiabilities + totalEquity)

  return NextResponse.json({
    asOfBs,
    asOfAd: asOfAd.toISOString().split('T')[0],
    fiscalYear: fy.label,
    assets: {
      current: currentAssets,
      fixed: fixedAssets,
      nonCurrent: nonCurrentAssets,
      total: totalAssets,
    },
    liabilities: {
      current: currentLiabilities,
      longTerm: longTermLiabilities,
      total: totalLiabilities,
    },
    equity: {
      accounts: equity.accounts,
      total: totalEquity,
      retainedEarningsAdjustment, // current period net profit (computed from vouchers)
      totalWithRetainedEarnings: totalEquity + retainedEarningsAdjustment,
    },
    summary: {
      totalAssets,
      totalLiabilities,
      totalEquity: totalEquity + retainedEarningsAdjustment,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity + retainedEarningsAdjustment,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity + retainedEarningsAdjustment)) < 0.01,
    },
  })
}
