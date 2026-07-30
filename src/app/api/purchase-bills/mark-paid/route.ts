// ============================================================
// API: Mark purchase bill as paid
// POST /api/purchase-bills/mark-paid?id=xxx
//   - Updates bill status to PAID
//   - Creates a payment voucher: Dr. Accounts Payable, Cr. Bank/Cash
//   - (TDS was already deducted at bill creation time)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'
import { adToBsString, bsStringToAd, isValidBsDate } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

async function ensureSchema() {
  const ready = await isSchemaInitialized()
  if (!ready) await initializeSchema()
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema()
    const { searchParams } = new URL(req.url)
    const billId = searchParams.get('id')
    const body = await req.json().catch(() => ({}))
    const { paymentMethod, paymentBsDate, paymentAccountCode } = body

    if (!billId) {
      return NextResponse.json({ error: 'Bill id required' }, { status: 400 })
    }

    const bill = await db.purchaseBill.findUnique({
      where: { id: billId },
      include: { party: true, lines: true },
    })

    if (!bill || bill.tenantId !== DEMO_TENANT_ID) {
      return NextResponse.json({ error: 'Purchase bill not found' }, { status: 404 })
    }

    if (bill.status === 'PAID') {
      return NextResponse.json({ error: 'Bill is already marked as paid' }, { status: 400 })
    }

    const effectiveBsDate = paymentBsDate && isValidBsDate(paymentBsDate) ? paymentBsDate : adToBsString(new Date())
    const adDate = bsStringToAd(effectiveBsDate)
    // Net payable = total - TDS (TDS already withheld)
    const amount = Number(bill.netPayable)

    const paymentAccCode = paymentAccountCode || '1002' // Bank NPR
    const paymentAcc = await db.account.findFirst({
      where: { tenantId: DEMO_TENANT_ID, code: paymentAccCode },
    })
    const apAcc = await db.account.findFirst({
      where: { tenantId: DEMO_TENANT_ID, code: '2001' }, // Accounts Payable
    })

    if (!paymentAcc || !apAcc) {
      return NextResponse.json({ error: 'Payment or AP account not found' }, { status: 500 })
    }

    const fiscalYear = await db.fiscalYear.findFirst({
      where: { tenantId: DEMO_TENANT_ID, adStart: { lte: adDate }, adEnd: { gte: adDate } },
    })

    // Execute in transaction for data integrity
    const result = await db.$transaction(async (tx) => {
      // 1. Update bill status
      const updated = await tx.purchaseBill.update({
        where: { id: billId },
        data: { status: 'PAID', paidAmount: amount },
      })

      // 2. Create payment voucher: Dr. AP, Cr. Bank (with proper PV prefix)
      const datePart = effectiveBsDate.replace(/-/g, '')
      const existing = await tx.voucher.count({
        where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `PV-${datePart}` } },
      })
      const voucherNo = `PV-${datePart}-${String(existing + 1).padStart(3, '0')}`

      const voucher = await tx.voucher.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          fiscalYearId: fiscalYear?.id,
          voucherNo,
          voucherType: 'PAYMENT',
          bsDate: effectiveBsDate,
          adDate,
          narration: `Payment made for ${bill.billNo} to ${bill.party.name} (${paymentMethod || 'Bank'})`,
          refType: 'PURCHASE_BILL',
          refId: bill.id,
          totalDebit: amount,
          totalCredit: amount,
          status: 'POSTED',
          lines: {
            create: [
              { accountId: apAcc.id, debit: amount, credit: 0, description: `Payment to ${bill.party.name} for ${bill.billNo}` },
              { accountId: paymentAcc.id, debit: 0, credit: amount, description: `Paid via ${paymentMethod || 'Bank'}` },
            ],
          },
        },
      })

      return { updated, voucher }
    })

    return NextResponse.json({
      success: true,
      bill: result.updated,
      voucher: { voucherNo: result.voucher.voucherNo, id: result.voucher.id },
      message: `Bill ${bill.billNo} marked as PAID. Payment voucher ${result.voucher.voucherNo} created.`,
    })
  } catch (err: any) {
    console.error('[purchase-bills/mark-paid] error:', err)
    return NextResponse.json({
      error: 'Failed to mark bill as paid',
      detail: err.message,
      code: err.code,
    }, { status: 500 })
  }
}
