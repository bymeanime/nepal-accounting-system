// ============================================================
// API: Export Trial Balance as Excel
// GET /api/export/trial-balance?asOfBs=2083-03-27
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
  const fy = getFiscalYear(new Date(asOfAd))

  const tenant = await db.tenant.findUnique({ where: { id: DEMO_TENANT_ID } })

  const accounts = await db.account.findMany({
    where: { tenantId: DEMO_TENANT_ID, isGroup: false, isActive: true },
    orderBy: { code: 'asc' },
  })

  const rows: Array<Array<string | number>> = []
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
    let debit = Number(acc.openingBalance), credit = 0
    for (const vl of voucherLines) {
      debit += Number(vl.debit)
      credit += Number(vl.credit)
    }
    const netDebit = debit - credit
    if (Math.abs(netDebit) < 0.01 && debit === 0) continue

    let displayDebit = 0, displayCredit = 0
    if (netDebit >= 0) { displayDebit = netDebit; totalDebit += netDebit }
    else { displayCredit = -netDebit; totalCredit += -netDebit }

    rows.push([acc.code, acc.name, acc.type, acc.subType || '', displayDebit, displayCredit])
  }

  const buffer = await generateExcelWorkbook({
    filename: `Trial-Balance-${asOfBs}`,
    sheets: [{
      name: 'Trial Balance',
      headers: ['Code', 'Account Name', 'Type', 'Sub-Type', 'Debit (NPR)', 'Credit (NPR)'],
      rows,
      totals: [
        { label: 'TOTAL DEBIT', amount: totalDebit },
        { label: 'TOTAL CREDIT', amount: totalCredit },
        { label: 'DIFFERENCE', amount: totalDebit - totalCredit },
      ],
    }],
  })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Trial-Balance-${asOfBs}.xlsx"`,
    },
  })
}
