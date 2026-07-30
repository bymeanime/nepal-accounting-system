// ============================================================
// API: Profit & Loss Statement (optimized — 2 queries instead of ~180)
// GET /api/profit-loss?fromBs=2082-04-01&toBs=2083-03-27
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'
import { bsStringToAd, isValidBsDate, getFiscalYear } from '@/lib/nepaliCalendar'
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
    const fy = getFiscalYear(new Date())
    const fromBs = searchParams.get('fromBs') && isValidBsDate(searchParams.get('fromBs')!) ? searchParams.get('fromBs')! : fy.startBs
    const toBs = searchParams.get('toBs') && isValidBsDate(searchParams.get('toBs')!) ? searchParams.get('toBs')! : fy.endBs

    const fromAd = bsStringToAd(fromBs)
    const toAd = bsStringToAd(toBs)

    // 2 queries total — was 180+ before
    const balances = await computeAccountBalances(DEMO_TENANT_ID, { from: fromAd, to: toAd }, false)

    // Group by type and subType
    function getAccountsByType(accountType: string, subType?: string) {
      const result: any[] = []
      let total = 0
      for (const [, info] of balances) {
        if (info.isGroup) continue
        if (info.type !== accountType) continue
        if (subType && info.subType !== subType) continue
        if (Math.abs(info.balance) < 0.01) continue

        // Income: credit balance is positive → balance is negative (debit - credit), so negate
        // Expense: debit balance is positive → balance is positive
        const displayBalance = accountType === 'INCOME' ? Math.abs(info.balance) : info.balance
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

    const operatingIncome = getAccountsByType('INCOME', 'OPERATING')
    const nonOperatingIncome = getAccountsByType('INCOME', 'NON_OPERATING')
    const cogs = getAccountsByType('EXPENSE', 'COGS')
    const adminExpenses = getAccountsByType('EXPENSE', 'ADMIN')
    const sellingExpenses = getAccountsByType('EXPENSE', 'SELLING')
    const financialExpenses = getAccountsByType('EXPENSE', 'FINANCIAL')
    const taxExpenses = getAccountsByType('EXPENSE', 'TAX')

    const totalRevenue = operatingIncome.total + nonOperatingIncome.total
    const totalOperatingExpenses = adminExpenses.total + sellingExpenses.total + financialExpenses.total
    const grossProfit = operatingIncome.total - cogs.total
    const netProfitBeforeTax = grossProfit - totalOperatingExpenses + nonOperatingIncome.total
    const netProfitAfterTax = netProfitBeforeTax - taxExpenses.total

    return NextResponse.json({
      period: {
        fromBs,
        toBs,
        fromAd: fromAd.toISOString().split('T')[0],
        toAd: toAd.toISOString().split('T')[0],
        fiscalYear: fy.label,
      },
      income: {
        operating: operatingIncome.accounts,
        nonOperating: nonOperatingIncome.accounts,
        totalOperating: operatingIncome.total,
        totalNonOperating: nonOperatingIncome.total,
        totalRevenue,
      },
      expenses: {
        cogs: cogs.accounts,
        admin: adminExpenses.accounts,
        selling: sellingExpenses.accounts,
        financial: financialExpenses.accounts,
        tax: taxExpenses.accounts,
        totalCogs: cogs.total,
        totalAdmin: adminExpenses.total,
        totalSelling: sellingExpenses.total,
        totalFinancial: financialExpenses.total,
        totalTax: taxExpenses.total,
        totalOperatingExpenses,
        totalExpenses: cogs.total + totalOperatingExpenses + taxExpenses.total,
      },
      summary: {
        grossProfit,
        netProfitBeforeTax,
        netProfitAfterTax,
      },
    })
  } catch (err: any) {
    console.error('[profit-loss] error:', err)
    return NextResponse.json({ error: 'Failed to compute P&L', detail: err.message }, { status: 500 })
  }
}
