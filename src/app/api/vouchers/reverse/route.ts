// ============================================================
// API: Voucher Reversal
// POST /api/vouchers/reverse?id=xxx
// Creates a reversal voucher that mirrors the original (swaps debit/credit)
// Per Nepal AS-5, errors must be corrected by reversal, not deletion
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'
import { adToBsString } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

async function ensureSchema() {
  const ready = await isSchemaInitialized()
  if (!ready) await initializeSchema()
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema()
    const { searchParams } = new URL(req.url)
    const voucherId = searchParams.get('id')
    const body = await req.json().catch(() => ({}))
    const { reversalReason } = body

    if (!voucherId) {
      return NextResponse.json({ error: 'Voucher id required' }, { status: 400 })
    }

    const original = await db.voucher.findUnique({
      where: { id: voucherId },
      include: { lines: true },
    })

    if (!original || original.tenantId !== DEMO_TENANT_ID) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 })
    }

    if (original.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Voucher is already cancelled' }, { status: 400 })
    }

    // Create reversal voucher (swap debit/credit) + cancel original — in a transaction
    const result = await db.$transaction(async (tx) => {
      // Cancel the original
      await tx.voucher.update({
        where: { id: voucherId },
        data: { status: 'CANCELLED' },
      })

      // Create reversal voucher with swapped lines
      const reversalBsDate = adToBsString(new Date())
      const reversalAdDate = new Date()
      const datePart = reversalBsDate.replace(/-/g, '')
      const reversalType = original.voucherType === 'SALES' ? 'SALES'
        : original.voucherType === 'PURCHASE' ? 'PURCHASE'
        : original.voucherType === 'RECEIPT' ? 'PAYMENT'  // reverse a receipt with a payment
        : original.voucherType === 'PAYMENT' ? 'RECEIPT'  // reverse a payment with a receipt
        : 'JOURNAL'

      const prefix = reversalType === 'SALES' ? 'SV' : reversalType === 'PURCHASE' ? 'BV'
        : reversalType === 'RECEIPT' ? 'RV' : reversalType === 'PAYMENT' ? 'PV' : 'JV'
      const existing = await tx.voucher.count({
        where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `${prefix}-${datePart}` } },
      })
      const reversalVoucherNo = `${prefix}-${datePart}-${String(existing + 1).padStart(3, '0')}`

      // Swap debit and credit for each line
      const reversalLines = original.lines.map(l => ({
        accountId: l.accountId,
        debit: Number(l.credit),  // swap
        credit: Number(l.debit),  // swap
        description: `Reversal: ${l.description || original.narration}`,
      }))

      const totalDebit = reversalLines.reduce((s, l) => s + l.debit, 0)
      const totalCredit = reversalLines.reduce((s, l) => s + l.credit, 0)

      const reversalVoucher = await tx.voucher.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          fiscalYearId: original.fiscalYearId,
          voucherNo: reversalVoucherNo,
          voucherType: reversalType,
          bsDate: reversalBsDate,
          adDate: reversalAdDate,
          narration: `REVERSAL of ${original.voucherNo} — ${reversalReason || 'Error correction'}`,
          refType: 'VOUCHER',
          refId: original.id,
          totalDebit,
          totalCredit,
          status: 'POSTED',
          lines: { create: reversalLines },
        },
        include: { lines: { include: { account: true } } },
      })

      return { original, reversalVoucher }
    })

    return NextResponse.json({
      success: true,
      originalVoucherNo: result.original.voucherNo,
      reversalVoucherNo: result.reversalVoucher.voucherNo,
      message: `Voucher ${result.original.voucherNo} cancelled. Reversal voucher ${result.reversalVoucher.voucherNo} created.`,
    })
  } catch (err: any) {
    console.error('[vouchers/reverse] error:', err)
    return NextResponse.json({
      error: 'Failed to reverse voucher',
      detail: err.message,
    }, { status: 500 })
  }
}
