// ============================================================
// API: Profit & Loss Statement (NFRS/NAS-compliant)
// GET /api/profit-loss?fromBs=2082-04-01&toBs=2083-03-15
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bsStringToAd, isValidBsDate, getFiscalYear } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fy = getFiscalYear(new Date())
  const fromBs = searchParams.get('fromBs') && isValidBsDate(searchParams.get('fromBs')!) ? searchParams.get('fromBs')! : fy.startBs
  const toBs = searchParams.get('toBs') && isValidBsDate(searchParams.get('toBs')!) ? searchParams.get('toBs')! : fy.endBs

  const fromAd = bsStringToAd(fromBs)
  const toAd = bsStringToAd(toBs)

  async function sumAccountsByType(accountType: string, subType?: string): Promise<{ accounts: any[]; total: number }> {
    const where: any = { tenantId: DEMO_TENANT_ID, type: accountType, isGroup: false, isActive: true }
    if (subType) where.subType = subType

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
            adDate: { gte: fromAd, lte: toAd },
          },
        },
        select: { debit: true, credit: true },
      })
      let debit = 0, credit = 0
      for (const vl of voucherLines) {
        debit += Number(vl.debit)
        credit += Number(vl.credit)
      }
      // Income has natural credit balance; Expense has natural debit balance
      const balance = accountType === 'INCOME' ? (credit - debit) : (debit - credit)
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

  // Group income by subType
  const operatingIncome = await sumAccountsByType('INCOME', 'OPERATING')
  const nonOperatingIncome = await sumAccountsByType('INCOME', 'NON_OPERATING')

  // Group expenses by subType
  const cogs = await sumAccountsByType('EXPENSE', 'COGS')
  const adminExpenses = await sumAccountsByType('EXPENSE', 'ADMIN')
  const sellingExpenses = await sumAccountsByType('EXPENSE', 'SELLING')
  const financialExpenses = await sumAccountsByType('EXPENSE', 'FINANCIAL')
  const taxExpenses = await sumAccountsByType('EXPENSE', 'TAX')

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
}
