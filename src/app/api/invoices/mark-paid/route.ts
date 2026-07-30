// ============================================================
// API: Mark invoice as paid
// POST /api/invoices/mark-paid?id=xxx
//   - Updates invoice status to PAID
//   - Creates a payment voucher: Dr. Bank/Cash, Cr. Accounts Receivable
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
    const invoiceId = searchParams.get('id')
    const body = await req.json().catch(() => ({}))
    const { paymentMethod, paymentBsDate, paymentAccountCode } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice id required' }, { status: 400 })
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { party: true, lines: true },
    })

    if (!invoice || invoice.tenantId !== DEMO_TENANT_ID) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json({ error: 'Invoice is already marked as paid' }, { status: 400 })
    }

    const effectiveBsDate = paymentBsDate && isValidBsDate(paymentBsDate) ? paymentBsDate : adToBsString(new Date())
    const adDate = bsStringToAd(effectiveBsDate)
    const amount = Number(invoice.totalAmount)

    // Determine payment account (Bank by default, or Cash if specified)
    const paymentAccCode = paymentAccountCode || '1002' // Bank NPR
    const paymentAcc = await db.account.findFirst({
      where: { tenantId: DEMO_TENANT_ID, code: paymentAccCode },
    })
    const arAcc = await db.account.findFirst({
      where: { tenantId: DEMO_TENANT_ID, code: '1010' }, // Accounts Receivable
    })

    if (!paymentAcc || !arAcc) {
      return NextResponse.json({ error: 'Payment or AR account not found in chart of accounts' }, { status: 500 })
    }

    const fiscalYear = await db.fiscalYear.findFirst({
      where: { tenantId: DEMO_TENANT_ID, adStart: { lte: adDate }, adEnd: { gte: adDate } },
    })

    // Update invoice status
    const updated = await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAmount: amount,
      },
    })

    // Create payment voucher: Dr. Bank, Cr. Accounts Receivable
    const datePart = effectiveBsDate.replace(/-/g, '')
    const existing = await db.voucher.count({
      where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `RCPT-${datePart}` } },
    })
    const voucherNo = `RCPT-${datePart}-${String(existing + 1).padStart(3, '0')}`

    const voucher = await db.voucher.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        fiscalYearId: fiscalYear?.id,
        voucherNo,
        voucherType: 'RECEIPT',
        bsDate: effectiveBsDate,
        adDate,
        narration: `Payment received for ${invoice.invoiceNo} from ${invoice.party.name} (${paymentMethod || 'Bank'})`,
        refType: 'INVOICE',
        refId: invoice.id,
        totalDebit: amount,
        totalCredit: amount,
        status: 'POSTED',
        lines: {
          create: [
            {
              accountId: paymentAcc.id,
              debit: amount,
              credit: 0,
              description: `Payment received via ${paymentMethod || 'Bank'}`,
            },
            {
              accountId: arAcc.id,
              debit: 0,
              credit: amount,
              description: `Against ${invoice.invoiceNo}`,
            },
          ],
        },
      },
    })

    return NextResponse.json({
      success: true,
      invoice: updated,
      voucher: { voucherNo: voucher.voucherNo, id: voucher.id },
      message: `Invoice ${invoice.invoiceNo} marked as PAID. Receipt voucher ${voucher.voucherNo} created.`,
    })
  } catch (err: any) {
    console.error('[invoices/mark-paid] error:', err)
    return NextResponse.json({
      error: 'Failed to mark invoice as paid',
      detail: err.message,
      code: err.code,
    }, { status: 500 })
  }
}
