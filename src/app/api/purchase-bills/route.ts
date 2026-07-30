// ============================================================
// API: Purchase Bills — with TDS capture + input VAT
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bsStringToAd, isValidBsDate } from '@/lib/nepaliCalendar'
import { calculateTds, calculateVat } from '@/lib/taxEngine'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  const bills = await db.purchaseBill.findMany({
    where: { tenantId: DEMO_TENANT_ID },
    orderBy: { adDate: 'desc' },
    take: limit,
    include: { party: true, lines: true },
  })
  return NextResponse.json({ bills })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { bsDate, partyId, vendorPan, vendorBillNo, lines, tdsSection, notes, dueDate } = body

    if (!bsDate || !isValidBsDate(bsDate)) {
      return NextResponse.json({ error: 'Invalid BS date' }, { status: 400 })
    }
    if (!partyId) {
      return NextResponse.json({ error: 'Party (vendor) required' }, { status: 400 })
    }

  const adDate = bsStringToAd(bsDate)
  const party = await db.party.findFirst({ where: { id: partyId, tenantId: DEMO_TENANT_ID } })
  if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 400 })

  const fiscalYear = await db.fiscalYear.findFirst({
    where: { tenantId: DEMO_TENANT_ID, adStart: { lte: adDate }, adEnd: { gte: adDate } },
  })

  // VAT calculation
  const calc = calculateVat(lines.map((l: any) => ({
    amount: Number(l.amount),
    vatRate: Number(l.vatRate || 13),
    isExempt: l.isExempt,
    isZeroRated: l.isZeroRated,
  })))

  // TDS calculation (on subtotal, not including VAT)
  let tdsRate = 0
  let tdsAmount = 0
  const effectiveTdsSection = tdsSection || party.tdsSection
  if (effectiveTdsSection) {
    // TDS base = gross payment EXCLUDING VAT (includes exempt + zero-rated amounts)
    // This is critical for VAT-exempt payments like rent — TDS still applies on the gross
    const tdsBase = calc.taxableAmount + calc.exemptAmount + calc.zeroRatedAmount
    const tdsCalc = await calculateTds(DEMO_TENANT_ID, effectiveTdsSection, tdsBase, bsDate)
    if (tdsCalc.isTdsApplicable) {
      tdsRate = tdsCalc.rate
      tdsAmount = tdsCalc.tdsAmount
    }
  }
  const netPayable = calc.totalAmount - tdsAmount

  // Generate bill no
  const datePart = bsDate.replace(/-/g, '')
  const existing = await db.purchaseBill.count({
    where: { tenantId: DEMO_TENANT_ID, billNo: { startsWith: `PB-${datePart}` } },
  })
  const billNo = `PB-${datePart}-${String(existing + 1).padStart(3, '0')}`

  // Pre-fetch all accounts needed for voucher posting
  const inventoryAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '1052' } }) // Inventory - Finished Goods
  const purchExemptAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '5004' } }) // Purchases - Exempt
  const inputVatAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '1040' } }) // Input VAT
  const tdsAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '2004' } }) // TDS Payable
  const apAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '2001' } }) // Accounts Payable

  // Execute everything in a single transaction for data integrity
  const bill = await db.$transaction(async (tx) => {
    // 1. Create purchase bill + lines
    const bl = await tx.purchaseBill.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        fiscalYearId: fiscalYear?.id,
        billNo,
        vendorBillNo,
        bsDate,
        adDate,
        partyId,
        vendorPan: vendorPan || party.pan,
        subtotal: calc.subtotal,
        discountAmount: calc.discountAmount,
        taxableAmount: calc.taxableAmount,
        vatAmount: calc.vatAmount,
        exemptAmount: calc.exemptAmount,
        totalAmount: calc.totalAmount,
        tdsSection: effectiveTdsSection,
        tdsRate,
        tdsAmount,
        netPayable,
        status: 'UNPAID',
        dueDate: dueDate ? bsStringToAd(dueDate) : null,
        notes,
        lines: {
          create: lines.map((l: any) => ({
            description: l.description,
            quantity: Number(l.quantity || 1),
            unit: l.unit || 'PCS',
            rate: Number(l.rate || 0),
            taxableAmount: Number(l.amount),
            vatRate: Number(l.vatRate || 13),
            vatAmount: (Number(l.amount) * Number(l.vatRate || 13)) / 100,
            totalAmount: Number(l.amount) + (Number(l.amount) * Number(l.vatRate || 13)) / 100,
          })),
        },
      },
      include: { lines: true, party: true },
    })

    // 2. Create stock IN movements for each line item with an itemId
    for (const line of lines) {
      if (line.itemId) {
        const item = await tx.item.findFirst({ where: { id: line.itemId, tenantId: DEMO_TENANT_ID } })
        if (item) {
          const qty = Number(line.quantity || 1)
          const rate = Number(line.rate || 0)
          await tx.inventoryMovement.create({
            data: {
              tenantId: DEMO_TENANT_ID,
              itemId: item.id,
              type: 'IN',
              quantity: Math.abs(qty),
              rate,
              value: qty * rate,
              refType: 'PURCHASE',
              refId: bl.id,
              bsDate,
              adDate,
              notes: `Received via ${billNo}`,
            },
          })
        }
      }
    }

    // 3. Create purchase voucher:
    // Dr. Inventory (1052) — taxableAmount + exemptAmount (capitalized, not expensed to COGS)
    // Dr. Input VAT (1040) — vatAmount
    // Cr. TDS Payable (2004) — tdsAmount
    // Cr. Accounts Payable (2001) — netPayable
    const voucherLines: any[] = []
    const inventoryDebit = calc.taxableAmount + calc.exemptAmount + calc.zeroRatedAmount
    if (inventoryDebit > 0 && inventoryAcc) voucherLines.push({ accountId: inventoryAcc.id, debit: inventoryDebit, credit: 0, description: `Purchase ${billNo}` })
    if (calc.vatAmount > 0 && inputVatAcc) voucherLines.push({ accountId: inputVatAcc.id, debit: calc.vatAmount, credit: 0, description: 'Input VAT' })
    if (tdsAmount > 0 && tdsAcc) voucherLines.push({ accountId: tdsAcc.id, debit: 0, credit: tdsAmount, description: `TDS ${effectiveTdsSection}` })
    if (apAcc) voucherLines.push({ accountId: apAcc.id, debit: 0, credit: netPayable, description: 'Net payable' })

    const existingV = await tx.voucher.count({
      where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `BV-${datePart}` } },
    })
    const voucherNo = `BV-${datePart}-${String(existingV + 1).padStart(3, '0')}`
    const totalDebit = voucherLines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = voucherLines.reduce((s, l) => s + l.credit, 0)

    await tx.voucher.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        fiscalYearId: fiscalYear?.id,
        voucherNo,
        voucherType: 'PURCHASE',
        bsDate,
        adDate,
        narration: `Purchase bill ${billNo} — ${party.name}`,
        refType: 'PURCHASE_BILL',
        refId: bl.id,
        totalDebit,
        totalCredit,
        status: 'POSTED',
        lines: { create: voucherLines },
      },
    })

    return bl
  })

  return NextResponse.json({ bill })
  } catch (err: any) {
    console.error('[purchase-bills] POST error:', err)
    return NextResponse.json({
      error: 'Failed to create purchase bill',
      detail: err.message,
      code: err.code,
    }, { status: 500 })
  }
}
