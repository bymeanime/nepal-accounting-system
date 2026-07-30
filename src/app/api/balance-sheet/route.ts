// ============================================================
// API: Balance Sheet (optimized — 2 queries instead of ~180)
// GET /api/balance-sheet?asOfBs=2083-03-27
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'
import { bsStringToAd, isValidBsDate, adToBsString, getFiscalYear } from '@/lib/nepaliCalendar'
import { computeAccountBalances } from '@/lib/account-balances'

const DEMO_TENANT_ID = 'demo-tenant'

async function ensureSchema() {
  const ready = await isSchemaInitialized()
  if (!ready) await initializeSchema()
}

export async function GET(req: NextRequest) {
  try {
    await ensureSchema()
    const { searchParams } = new URL(req.url)
    const asOfBsParam = searchParams.get('asOfBs')
    const asOfBs = asOfBsParam && isValidBsDate(asOfBsParam) ? asOfBsParam : adToBsString(new Date())
    const asOfAd = bsStringToAd(asOfBs)
    const fy = getFiscalYear(new Date(asOfAd))

    // 2 queries total — was 180+ before
    const balances = await computeAccountBalances(DEMO_TENANT_ID, { to: asOfAd }, true)

    function getAccountsByType(accountType: string, subTypes?: string[]) {
      const result: any[] = []
      let total = 0
      for (const [, info] of balances) {
        if (info.isGroup) continue
        if (info.type !== accountType) continue
        if (subTypes && !subTypes.includes(info.subType || '')) continue
        if (Math.abs(info.balance) < 0.01) continue

        // ASSET: debit balance (positive)
        // LIABILITY/EQUITY: credit balance (negative → abs)
        const displayBalance = accountType === 'ASSET' ? info.balance : Math.abs(info.balance)
        result.push({
          code: info.code,
          name: info.name,
          nameNp: info.nameNp,
          subType: info.subType,
          balance: displayBalance,
        })
        total += displayBalance
      }
      result.sort((a, b) => a.code.localeCompare(b.code))
      return { accounts: result, total }
    }

    const currentAssets = getAccountsByType('ASSET', ['CURRENT_ASSET'])
    const fixedAssets = getAccountsByType('ASSET', ['FIXED_ASSET'])
    const nonCurrentAssets = getAccountsByType('ASSET', ['NON_CURRENT_ASSET'])

    const currentLiabilities = getAccountsByType('LIABILITY', ['CURRENT_LIABILITY'])
    const longTermLiabilities = getAccountsByType('LIABILITY', ['LONG_TERM_LIABILITY'])

    const equity = getAccountsByType('EQUITY')

    const totalAssets = currentAssets.total + fixedAssets.total + nonCurrentAssets.total
    const totalLiabilities = currentLiabilities.total + longTermLiabilities.total
    const totalEquity = equity.total

    // Retained earnings adjustment = current period P&L (not yet closed)
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
        retainedEarningsAdjustment,
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
  } catch (err: any) {
    console.error('[balance-sheet] error:', err)
    return NextResponse.json({ error: 'Failed to compute balance sheet', detail: err.message }, { status: 500 })
  }
}
