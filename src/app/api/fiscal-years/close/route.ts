// ============================================================
// API: Fiscal Year Close
// POST /api/fiscal-years/close?fiscalYearId=xxx
// Posts closing entries to clear P&L accounts to Retained Earnings:
//   1. Dr. all INCOME accounts / Cr. P&L Summary (3003 Retained Earnings)
//   2. Dr. P&L Summary / Cr. all EXPENSE accounts
//   3. Marks fiscal year as CLOSED
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'
import { adToBsString, bsStringToAd } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

async function ensureSchema() {
  const ready = await isSchemaInitialized()
  if (!ready) await initializeSchema()
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema()
    const { searchParams } = new URL(req.url)
    const fiscalYearId = searchParams.get('fiscalYearId')

    if (!fiscalYearId) {
      return NextResponse.json({ error: 'fiscalYearId required' }, { status: 400 })
    }

    const fy = await db.fiscalYear.findFirst({
      where: { id: fiscalYearId, tenantId: DEMO_TENANT_ID },
    })
    if (!fy) {
      return NextResponse.json({ error: 'Fiscal year not found' }, { status: 404 })
    }
    if (fy.status === 'CLOSED') {
      return NextResponse.json({ error: 'Fiscal year is already closed' }, { status: 400 })
    }

    // Get all income and expense accounts
    const incomeAccounts = await db.account.findMany({
      where: { tenantId: DEMO_TENANT_ID, type: 'INCOME', isGroup: false },
    })
    const expenseAccounts = await db.account.findMany({
      where: { tenantId: DEMO_TENANT_ID, type: 'EXPENSE', isGroup: false },
    })
    const retainedEarningsAcc = await db.account.findFirst({
      where: { tenantId: DEMO_TENANT_ID, code: '3003' }, // Retained Earnings
    })

    if (!retainedEarningsAcc) {
      return NextResponse.json({ error: 'Retained Earnings account (3003) not found' }, { status: 500 })
    }

    // Compute balances for each account within the fiscal year
    async function getAccountBalance(accountId: string): Promise<number> {
      const lines = await db.voucherLine.findMany({
        where: {
          accountId,
          voucher: {
            tenantId: DEMO_TENANT_ID,
            status: 'POSTED',
            adDate: { gte: fy.adStart, lte: fy.adEnd },
          },
        },
        select: { debit: true, credit: true },
      })
      let debit = 0, credit = 0
      for (const l of lines) { debit += Number(l.debit); credit += Number(l.credit) }
      return debit - credit
    }

    // Income: credit balance (positive = income)
    let totalIncome = 0
    const incomeLines: Array<{ accountId: string; debit: number; credit: number; description: string }> = []
    for (const acc of incomeAccounts) {
      const balance = await getAccountBalance(acc.id) // negative for income (credit > debit)
      const creditBalance = -balance // make positive
      if (Math.abs(creditBalance) < 0.01) continue
      totalIncome += creditBalance
      // Close: Dr. Income (to zero it), Cr. Retained Earnings
      incomeLines.push({
        accountId: acc.id,
        debit: creditBalance,
        credit: 0,
        description: `Closing entry — ${acc.name}`,
      })
    }

    // Expense: debit balance (positive = expense)
    let totalExpense = 0
    const expenseLines: Array<{ accountId: string; debit: number; credit: number; description: string }> = []
    for (const acc of expenseAccounts) {
      const balance = await getAccountBalance(acc.id) // positive for expense (debit > credit)
      if (Math.abs(balance) < 0.01) continue
      totalExpense += balance
      // Close: Dr. Retained Earnings, Cr. Expense (to zero it)
      expenseLines.push({
        accountId: acc.id,
        debit: 0,
        credit: balance,
        description: `Closing entry — ${acc.name}`,
      })
    }

    const netProfit = totalIncome - totalExpense

    // Retained Earnings entry: net profit = Cr. RE, net loss = Dr. RE
    const closingBsDate = adToBsString(fy.adEnd)
    const closingAdDate = fy.adEnd
    const datePart = closingBsDate.replace(/-/g, '')

    const result = await db.$transaction(async (tx) => {
      // Create closing voucher
      const voucherLines: any[] = []

      // Dr. all income accounts (to close them)
      for (const l of incomeLines) voucherLines.push(l)

      // Cr. all expense accounts (to close them)
      for (const l of expenseLines) voucherLines.push(l)

      // Net to Retained Earnings
      if (netProfit > 0) {
        // Profit: Cr. Retained Earnings
        voucherLines.push({
          accountId: retainedEarningsAcc.id,
          debit: 0,
          credit: netProfit,
          description: `Net profit for FY ${fy.bsYearStart}/${String(fy.bsYearEnd).slice(-2)} transferred to Retained Earnings`,
        })
      } else if (netProfit < 0) {
        // Loss: Dr. Retained Earnings
        voucherLines.push({
          accountId: retainedEarningsAcc.id,
          debit: Math.abs(netProfit),
          credit: 0,
          description: `Net loss for FY ${fy.bsYearStart}/${String(fy.bsYearEnd).slice(-2)} transferred to Retained Earnings`,
        })
      }

      const totalDebit = voucherLines.reduce((s, l) => s + l.debit, 0)
      const totalCredit = voucherLines.reduce((s, l) => s + l.credit, 0)

      const existing = await tx.voucher.count({
        where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `JV-CLOSE-${datePart}` } },
      })
      const voucherNo = `JV-CLOSE-${datePart}-${String(existing + 1).padStart(3, '0')}`

      const closingVoucher = await tx.voucher.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          fiscalYearId: fy.id,
          voucherNo,
          voucherType: 'JOURNAL',
          bsDate: closingBsDate,
          adDate: closingAdDate,
          narration: `Closing entries for FY ${fy.bsYearStart}/${String(fy.bsYearEnd).slice(-2)}`,
          refType: 'FISCAL_YEAR_CLOSE',
          refId: fy.id,
          totalDebit,
          totalCredit,
          status: 'POSTED',
          lines: { create: voucherLines },
        },
      })

      // Mark fiscal year as CLOSED
      await tx.fiscalYear.update({
        where: { id: fy.id },
        data: { status: 'CLOSED', closedAt: new Date() },
      })

      return { closingVoucher, totalIncome, totalExpense, netProfit }
    })

    return NextResponse.json({
      success: true,
      fiscalYear: `${fy.bsYearStart}/${String(fy.bsYearEnd).slice(-2)}`,
      closingVoucherNo: result.closingVoucher.voucherNo,
      summary: {
        totalIncome,
        totalExpense,
        netProfit,
        accountsClosed: incomeLines.length + expenseLines.length,
      },
      message: `FY ${fy.bsYearStart}/${String(fy.bsYearEnd).slice(-2)} closed. Net ${netProfit >= 0 ? 'profit' : 'loss'} of NPR ${Math.abs(netProfit).toLocaleString('en-IN')} transferred to Retained Earnings. Closing voucher ${result.closingVoucher.voucherNo} created.`,
    })
  } catch (err: any) {
    console.error('[fiscal-years/close] error:', err)
    return NextResponse.json({
      error: 'Failed to close fiscal year',
      detail: err.message,
    }, { status: 500 })
  }
}
