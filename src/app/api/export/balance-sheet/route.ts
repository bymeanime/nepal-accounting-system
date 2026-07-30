// ============================================================
// API: Export Balance Sheet as Excel
// GET /api/export/balance-sheet?asOfBs=2083-03-27
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateExcelWorkbook } from '@/lib/exports'
import { bsStringToAd, isValidBsDate, adToBsString, getFiscalYear } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const asOfBsParam = searchParams.get('asOfBs')
  const asOfBs = asOfBsParam && isValidBsDate(asOfBsParam) ? asOfBsParam : adToBsString(new Date())
  const asOfAd = bsStringToAd(asOfBs)

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
      for (const vl of voucherLines) { debit += Number(vl.debit); credit += Number(vl.credit) }
      const balance = accountType === 'ASSET' ? (debit - credit) : (credit - debit)
      if (Math.abs(balance) < 0.01) continue
      result.push({ code: acc.code, name: acc.name, nameNp: acc.nameNp, balance })
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
  const retainedEarningsAdjustment = totalAssets - (totalLiabilities + equity.total)

  const buffer = await generateExcelWorkbook({
    filename: `Balance-Sheet-${asOfBs}`,
    sheets: [{
      name: 'Balance Sheet',
      headers: ['Code', 'Account Name', 'Amount (NPR)'],
      rows: [
        ['ASSETS', '', ''],
        ...currentAssets.accounts.map(a => [a.code, a.name, a.balance]),
        ['', 'Total Current Assets', currentAssets.total],
        [],
        ...fixedAssets.accounts.map(a => [a.code, a.name, a.balance]),
        ['', 'Total Fixed Assets', fixedAssets.total],
        [],
        ...nonCurrentAssets.accounts.map(a => [a.code, a.name, a.balance]),
        ['', 'Total Non-Current Assets', nonCurrentAssets.total],
        [],
        ['', 'TOTAL ASSETS', totalAssets],
        [],
        ['LIABILITIES', '', ''],
        ...currentLiabilities.accounts.map(a => [a.code, a.name, a.balance]),
        ['', 'Total Current Liabilities', currentLiabilities.total],
        [],
        ...longTermLiabilities.accounts.map(a => [a.code, a.name, a.balance]),
        ['', 'Total Long-Term Liabilities', longTermLiabilities.total],
        [],
        ['EQUITY', '', ''],
        ...equity.accounts.map(a => [a.code, a.name, a.balance]),
        ['', 'Current Period P&L (Retained Earnings adj.)', retainedEarningsAdjustment],
        [],
        ['', 'TOTAL LIABILITIES + EQUITY', totalLiabilities + equity.total + retainedEarningsAdjustment],
      ],
    }],
  })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Balance-Sheet-${asOfBs}.xlsx"`,
    },
  })
}
