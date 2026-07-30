// ============================================================
// API: Advance Payments
// POST /api/advance-payments — record advance to supplier (with TDS) or from customer
// GET /api/advance-payments — list all advances
//
// Supplier advance: Dr. Advances to Suppliers (1020), Cr. Bank
//   + TDS deducted: Cr. TDS Payable (2004) — TDS on advance per ITA §88
// Customer advance: Dr. Bank, Cr. Advances from Customers (2002)
//   + Output VAT: Cr. Output VAT (2003) — VAT on advance per VAT Act
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'
import { bsStringToAd, isValidBsDate } from '@/lib/nepaliCalendar'
import { calculateTds } from '@/lib/taxEngine'

const DEMO_TENANT_ID = 'demo-tenant'

async function ensureSchema() {
  const ready = await isSchemaInitialized()
  if (!ready) await initializeSchema()
}

export async function GET() {
  try {
    await ensureSchema()
    const advances = await db.voucher.findMany({
      where: { tenantId: DEMO_TENANT_ID, refType: 'ADVANCE_PAYMENT', status: 'POSTED' },
      orderBy: { adDate: 'desc' },
      include: { lines: { include: { account: true } } },
    })
    return NextResponse.json({ advances })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to load advances', detail: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema()
    const body = await req.json()
    const { type, partyId, bsDate, amount, tdsSection, notes } = body

    // type: 'SUPPLIER' (advance to supplier) or 'CUSTOMER' (advance from customer)
    if (!type || !partyId || !bsDate || !amount) {
      return NextResponse.json({ error: 'type, partyId, bsDate, amount required' }, { status: 400 })
    }
    if (!isValidBsDate(bsDate)) {
      return NextResponse.json({ error: 'Invalid BS date' }, { status: 400 })
    }

    const adDate = bsStringToAd(bsDate)
    const party = await db.party.findFirst({ where: { id: partyId, tenantId: DEMO_TENANT_ID } })
    if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })

    const fiscalYear = await db.fiscalYear.findFirst({
      where: { tenantId: DEMO_TENANT_ID, adStart: { lte: adDate }, adEnd: { gte: adDate } },
    })

    // Pre-fetch accounts
    const bankAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '1002' } })
    const advanceSupplierAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '1020' } })
    const advanceCustomerAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '2002' } })
    const tdsAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '2004' } })
    const outputVatAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '2003' } })

    const datePart = bsDate.replace(/-/g, '')

    if (type === 'SUPPLIER') {
      // Advance to supplier with TDS deduction
      const effectiveTdsSection = tdsSection || party.tdsSection
      let tdsAmount = 0
      let tdsRate = 0
      if (effectiveTdsSection) {
        const tdsCalc = await calculateTds(DEMO_TENANT_ID, effectiveTdsSection, amount, bsDate)
        if (tdsCalc.isTdsApplicable) {
          tdsAmount = tdsCalc.tdsAmount
          tdsRate = tdsCalc.rate
        }
      }
      const netPayment = amount - tdsAmount

      const result = await db.$transaction(async (tx) => {
        const voucherLines: any[] = []
        if (advanceSupplierAcc) voucherLines.push({ accountId: advanceSupplierAcc.id, debit: amount, credit: 0, description: `Advance to ${party.name}` })
        if (bankAcc) voucherLines.push({ accountId: bankAcc.id, debit: 0, credit: netPayment, description: `Net payment via Bank` })
        if (tdsAmount > 0 && tdsAcc) voucherLines.push({ accountId: tdsAcc.id, debit: 0, credit: tdsAmount, description: `TDS ${effectiveTdsSection} @ ${tdsRate}%` })

        const existing = await tx.voucher.count({
          where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `PV-${datePart}` } },
        })
        const voucherNo = `PV-${datePart}-${String(existing + 1).padStart(3, '0')}`

        const voucher = await tx.voucher.create({
          data: {
            tenantId: DEMO_TENANT_ID, fiscalYearId: fiscalYear?.id, voucherNo,
            voucherType: 'PAYMENT', bsDate, adDate,
            narration: `Advance payment to ${party.name} — ${notes || 'Supplier advance'}`,
            refType: 'ADVANCE_PAYMENT', refId: party.id,
            totalDebit: voucherLines.reduce((s, l) => s + l.debit, 0),
            totalCredit: voucherLines.reduce((s, l) => s + l.credit, 0),
            status: 'POSTED',
            lines: { create: voucherLines },
          },
        })
        return { voucher, tdsAmount, netPayment }
      })

      return NextResponse.json({
        success: true,
        voucherNo: result.voucher.voucherNo,
        type: 'SUPPLIER_ADVANCE',
        amount,
        tdsDeducted: result.tdsAmount,
        netPaid: result.netPayment,
        message: `Advance of NPR ${amount.toLocaleString('en-IN')} paid to ${party.name}. TDS deducted: NPR ${result.tdsAmount.toLocaleString('en-IN')}. Net paid: NPR ${result.netPayment.toLocaleString('en-IN')}.`,
      })
    } else if (type === 'CUSTOMER') {
      // Advance from customer with VAT
      const vatAmount = (amount * 13) / 100
      const totalReceived = amount + vatAmount

      const result = await db.$transaction(async (tx) => {
        const voucherLines: any[] = []
        if (bankAcc) voucherLines.push({ accountId: bankAcc.id, debit: totalReceived, credit: 0, description: `Advance from ${party.name}` })
        if (advanceCustomerAcc) voucherLines.push({ accountId: advanceCustomerAcc.id, debit: 0, credit: amount, description: 'Customer advance (liability)' })
        if (outputVatAcc) voucherLines.push({ accountId: outputVatAcc.id, debit: 0, credit: vatAmount, description: 'Output VAT on advance @ 13%' })

        const existing = await tx.voucher.count({
          where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `RV-${datePart}` } },
        })
        const voucherNo = `RV-${datePart}-${String(existing + 1).padStart(3, '0')}`

        const voucher = await tx.voucher.create({
          data: {
            tenantId: DEMO_TENANT_ID, fiscalYearId: fiscalYear?.id, voucherNo,
            voucherType: 'RECEIPT', bsDate, adDate,
            narration: `Advance received from ${party.name} — ${notes || 'Customer advance'}`,
            refType: 'ADVANCE_PAYMENT', refId: party.id,
            totalDebit: voucherLines.reduce((s, l) => s + l.debit, 0),
            totalCredit: voucherLines.reduce((s, l) => s + l.credit, 0),
            status: 'POSTED',
            lines: { create: voucherLines },
          },
        })
        return { voucher, vatAmount, totalReceived }
      })

      return NextResponse.json({
        success: true,
        voucherNo: result.voucher.voucherNo,
        type: 'CUSTOMER_ADVANCE',
        advanceAmount: amount,
        vatCollected: result.vatAmount,
        totalReceived: result.totalReceived,
        message: `Advance of NPR ${amount.toLocaleString('en-IN')} received from ${party.name}. VAT collected: NPR ${result.vatAmount.toLocaleString('en-IN')}. Total received: NPR ${result.totalReceived.toLocaleString('en-IN')}.`,
      })
    } else {
      return NextResponse.json({ error: 'type must be SUPPLIER or CUSTOMER' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('[advance-payments] error:', err)
    return NextResponse.json({ error: 'Failed to create advance payment', detail: err.message }, { status: 500 })
  }
}
