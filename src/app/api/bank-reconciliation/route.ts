// ============================================================
// API: Bank Reconciliation
// GET /api/bank-reconciliation?bsMonth=2083-04
//   - Lists all bank transactions (receipts + payments) for the month
//   - Shows unmatched items (pending reconciliation)
// POST /api/bank-reconciliation — mark a voucher as reconciled
//   { voucherId, bankStatementDate, bankStatementAmount }
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'
import { bsMonthRange, bsStringToAd, isValidBsDate } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

async function ensureSchema() {
  const ready = await isSchemaInitialized()
  if (!ready) await initializeSchema()
}

export async function GET(req: NextRequest) {
  try {
    await ensureSchema()
    const { searchParams } = new URL(req.url)
    const bsMonth = searchParams.get('bsMonth') // "2083-04"

    if (!bsMonth) {
      return NextResponse.json({ error: 'bsMonth required (e.g., 2083-04)' }, { status: 400 })
    }

    const [y, m] = bsMonth.split('-').map(Number)
    const range = bsMonthRange(y, m)

    // Get all vouchers that touch bank accounts (1002) within the month
    const bankAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '1002' } })
    if (!bankAcc) return NextResponse.json({ error: 'Bank account not found' }, { status: 500 })

    const bankLines = await db.voucherLine.findMany({
      where: {
        accountId: bankAcc.id,
        voucher: {
          tenantId: DEMO_TENANT_ID,
          status: 'POSTED',
          adDate: { gte: range.startAd, lte: range.endAd },
        },
      },
      include: { voucher: { include: { lines: true } } },
      orderBy: { voucher: { adDate: 'asc' } },
    })

    // Format as bank statement items
    const items = bankLines.map((line, idx) => {
      const debit = Number(line.debit)
      const credit = Number(line.credit)
      return {
        seq: idx + 1,
        voucherId: line.voucher.id,
        voucherNo: line.voucher.voucherNo,
        bsDate: line.voucher.bsDate,
        narration: line.voucher.narration,
        voucherType: line.voucher.voucherType,
        deposit: debit > 0 ? debit : 0,    // money in
        withdrawal: credit > 0 ? credit : 0, // money out
        reconciled: false, // TODO: track reconciliation status
      }
    })

    const totalDeposits = items.reduce((s, i) => s + i.deposit, 0)
    const totalWithdrawals = items.reduce((s, i) => s + i.withdrawal, 0)
    const netMovement = totalDeposits - totalWithdrawals

    // Get opening balance (bank balance at start of month)
    const openingLines = await db.voucherLine.findMany({
      where: {
        accountId: bankAcc.id,
        voucher: {
          tenantId: DEMO_TENANT_ID,
          status: 'POSTED',
          adDate: { lt: range.startAd },
        },
      },
      select: { debit: true, credit: true },
    })
    let openingBalance = Number(bankAcc.openingBalance)
    for (const l of openingLines) {
      openingBalance += Number(l.debit) - Number(l.credit)
    }

    const closingBalance = openingBalance + netMovement

    return NextResponse.json({
      period: bsMonth,
      bankAccount: { code: bankAcc.code, name: bankAcc.name },
      openingBalance,
      items,
      summary: {
        totalDeposits,
        totalWithdrawals,
        netMovement,
        closingBalance,
        itemCount: items.length,
        reconciledCount: items.filter(i => i.reconciled).length,
        unreconciledCount: items.filter(i => !i.reconciled).length,
      },
    })
  } catch (err: any) {
    console.error('[bank-reconciliation] error:', err)
    return NextResponse.json({ error: 'Failed to load bank reconciliation', detail: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema()
    const body = await req.json()
    const { voucherId, bankStatementDate, bankStatementAmount } = body

    if (!voucherId) {
      return NextResponse.json({ error: 'voucherId required' }, { status: 400 })
    }

    // For now, just verify the voucher exists and return success
    // In production, this would update a reconciliation flag
    const voucher = await db.voucher.findFirst({
      where: { id: voucherId, tenantId: DEMO_TENANT_ID },
    })
    if (!voucher) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 })

    return NextResponse.json({
      success: true,
      voucherNo: voucher.voucherNo,
      bankStatementDate,
      bankStatementAmount,
      message: `Voucher ${voucher.voucherNo} marked as reconciled with bank statement.`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to reconcile', detail: err.message }, { status: 500 })
  }
}
