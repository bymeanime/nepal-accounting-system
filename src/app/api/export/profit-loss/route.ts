// ============================================================
// API: Export P&L as Excel
// GET /api/export/profit-loss?fromBs=2082-04-01&toBs=2083-03-27
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateExcelWorkbook } from '@/lib/exports'
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
      for (const vl of voucherLines) { debit += Number(vl.debit); credit += Number(vl.credit) }
      const balance = accountType === 'INCOME' ? (credit - debit) : (debit - credit)
      if (Math.abs(balance) < 0.01) continue
      result.push({ code: acc.code, name: acc.name, nameNp: acc.nameNp, balance })
      total += balance
    }
    return { accounts: result, total }
  }

  const operatingIncome = await sumAccountsByType('INCOME', 'OPERATING')
  const nonOperatingIncome = await sumAccountsByType('INCOME', 'NON_OPERATING')
  const cogs = await sumAccountsByType('EXPENSE', 'COGS')
  const adminExpenses = await sumAccountsByType('EXPENSE', 'ADMIN')
  const sellingExpenses = await sumAccountsByType('EXPENSE', 'SELLING')
  const financialExpenses = await sumAccountsByType('EXPENSE', 'FINANCIAL')
  const taxExpenses = await sumAccountsByType('EXPENSE', 'TAX')

  const buffer = await generateExcelWorkbook({
    filename: `P&L-${fromBs}-to-${toBs}`,
    sheets: [
      {
        name: 'P&L Summary',
        headers: ['Code', 'Account Name', 'Amount (NPR)'],
        rows: [
          ...operatingIncome.accounts.map(a => [a.code, a.name, a.balance]),
          ['', 'TOTAL OPERATING INCOME', operatingIncome.total],
          [],
          ...cogs.accounts.map(a => [a.code, a.name, a.balance]),
          ['', 'TOTAL COGS', cogs.total],
          [],
          ...adminExpenses.accounts.map(a => [a.code, a.name, a.balance]),
          ['', 'TOTAL ADMIN EXPENSES', adminExpenses.total],
          [],
          ...sellingExpenses.accounts.map(a => [a.code, a.name, a.balance]),
          ['', 'TOTAL SELLING EXPENSES', sellingExpenses.total],
          [],
          ...financialExpenses.accounts.map(a => [a.code, a.name, a.balance]),
          ['', 'TOTAL FINANCIAL EXPENSES', financialExpenses.total],
          [],
          ...taxExpenses.accounts.map(a => [a.code, a.name, a.balance]),
          ['', 'TOTAL TAX EXPENSES', taxExpenses.total],
          [],
          ...nonOperatingIncome.accounts.map(a => [a.code, a.name, a.balance]),
          ['', 'TOTAL NON-OPERATING INCOME', nonOperatingIncome.total],
          [],
          ['', 'GROSS PROFIT', operatingIncome.total - cogs.total],
          ['', 'NET PROFIT BEFORE TAX', operatingIncome.total - cogs.total - adminExpenses.total - sellingExpenses.total - financialExpenses.total + nonOperatingIncome.total],
          ['', 'NET PROFIT AFTER TAX', operatingIncome.total - cogs.total - adminExpenses.total - sellingExpenses.total - financialExpenses.total + nonOperatingIncome.total - taxExpenses.total],
        ],
      },
    ],
  })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="P&L-${fromBs}-to-${toBs}.xlsx"`,
    },
  })
}
