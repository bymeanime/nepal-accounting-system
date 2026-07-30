// ============================================================
// API: Debit Notes (Purchase Returns)
// POST /api/debit-notes
// Creates a debit note that reverses a purchase bill:
//   - Dr. Accounts Payable (2001) — reduce what we owe supplier
//   - Cr. Inventory (1052) — remove returned goods
//   - Cr. Input VAT (1040) — reverse input VAT claimed
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'
import { bsStringToAd, isValidBsDate } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

async function ensureSchema() {
  const ready = await isSchemaInitialized()
  if (!ready) await initializeSchema()
}

export async function GET() {
  try {
    await ensureSchema()
    const debitNotes = await db.voucher.findMany({
      where: { tenantId: DEMO_TENANT_ID, refType: 'DEBIT_NOTE', status: 'POSTED' },
      orderBy: { adDate: 'desc' },
      include: { lines: { include: { account: true } } },
    })
    return NextResponse.json({ debitNotes })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to load debit notes', detail: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema()
    const body = await req.json()
    const { originalBillId, bsDate, reason, lines } = body

    if (!bsDate || !isValidBsDate(bsDate)) {
      return NextResponse.json({ error: 'Valid BS date required' }, { status: 400 })
    }
    if (!originalBillId) {
      return NextResponse.json({ error: 'Original bill ID required' }, { status: 400 })
    }
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'At least one return line required' }, { status: 400 })
    }

    const adDate = bsStringToAd(bsDate)
    const original = await db.purchaseBill.findUnique({
      where: { id: originalBillId },
      include: { party: true, lines: true },
    })
    if (!original || original.tenantId !== DEMO_TENANT_ID) {
      return NextResponse.json({ error: 'Original purchase bill not found' }, { status: 404 })
    }

    // Pre-fetch accounts
    const apAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '2001' } })
    const inventoryAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '1052' } })
    const inputVatAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '1040' } })

    const fiscalYear = await db.fiscalYear.findFirst({
      where: { tenantId: DEMO_TENANT_ID, adStart: { lte: adDate }, adEnd: { gte: adDate } },
    })

    // Compute totals from return lines
    let totalInventory = 0, totalVat = 0
    for (const line of lines) {
      const qty = Number(line.quantity || 0)
      const rate = Number(line.rate || 0)
      const amount = qty * rate
      const vatRate = Number(line.vatRate || 13)
      totalInventory += amount
      totalVat += (amount * vatRate) / 100
    }
    const totalDebit = totalInventory + totalVat

    const datePart = bsDate.replace(/-/g, '')
    const result = await db.$transaction(async (tx) => {
      // 1. Create stock OUT movements (return goods to supplier)
      for (const line of lines) {
        if (line.itemId) {
          const item = await tx.item.findFirst({ where: { id: line.itemId, tenantId: DEMO_TENANT_ID } })
          if (item) {
            const qty = Number(line.quantity || 0)
            const rate = Number(line.rate || 0)
            await tx.inventoryMovement.create({
              data: {
                tenantId: DEMO_TENANT_ID, itemId: item.id, type: 'OUT',
                quantity: -Math.abs(qty), rate, value: qty * rate,
                refType: 'DEBIT_NOTE', bsDate, adDate,
                notes: `Returned to supplier via debit note for ${original.billNo}`,
              },
            })
          }
        }
      }

      // 2. Create debit note voucher (reverses the purchase)
      // Dr. AP (2001) — reduce what we owe
      // Cr. Inventory (1052) — remove goods
      // Cr. Input VAT (1040) — reverse input VAT
      const voucherLines: any[] = []
      if (apAcc) voucherLines.push({ accountId: apAcc.id, debit: totalDebit, credit: 0, description: `Purchase return — ${original.billNo}` })
      if (totalInventory > 0 && inventoryAcc) voucherLines.push({ accountId: inventoryAcc.id, debit: 0, credit: totalInventory, description: 'Inventory returned to supplier' })
      if (totalVat > 0 && inputVatAcc) voucherLines.push({ accountId: inputVatAcc.id, debit: 0, credit: totalVat, description: 'Input VAT reversal' })

      const existing = await tx.voucher.count({
        where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `DN-${datePart}` } },
      })
      const voucherNo = `DN-${datePart}-${String(existing + 1).padStart(3, '0')}`

      const voucher = await tx.voucher.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          fiscalYearId: fiscalYear?.id,
          voucherNo,
          voucherType: 'JOURNAL',
          bsDate, adDate,
          narration: `Debit Note for ${original.billNo} — ${reason || 'Purchase return'}`,
          refType: 'DEBIT_NOTE',
          refId: original.id,
          totalDebit: voucherLines.reduce((s, l) => s + l.debit, 0),
          totalCredit: voucherLines.reduce((s, l) => s + l.credit, 0),
          status: 'POSTED',
          lines: { create: voucherLines },
        },
        include: { lines: { include: { account: true } } },
      })

      return voucher
    })

    return NextResponse.json({
      success: true,
      debitNoteNo: result.voucherNo,
      originalBill: original.billNo,
      totalDebit: totalDebit,
      message: `Debit note ${result.voucherNo} created for bill ${original.billNo}. Supplier balance reduced by NPR ${totalDebit.toLocaleString('en-IN')}.`,
    })
  } catch (err: any) {
    console.error('[debit-notes] error:', err)
    return NextResponse.json({ error: 'Failed to create debit note', detail: err.message }, { status: 500 })
  }
}
