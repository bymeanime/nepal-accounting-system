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
    const tdsCalc = await calculateTds(DEMO_TENANT_ID, effectiveTdsSection, calc.taxableAmount, bsDate)
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

  const bill = await db.purchaseBill.create({
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

  // Auto-create purchase voucher:
  // Dr. Purchase Taxable (5002) — taxableAmount
  // Dr. Input VAT (1040) — vatAmount
  // Dr. (or Cr.) Exempt purchases if any (5004)
  // Cr. TDS Payable (2004) — tdsAmount
  // Cr. Accounts Payable (2001) — netPayable
  const purchAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '5002' } })
  const purchExemptAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '5004' } })
  const inputVatAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '1040' } })
  const tdsAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '2004' } })
  const apAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '2001' } })

  const voucherLines: any[] = []
  if (calc.taxableAmount > 0 && purchAcc) voucherLines.push({ accountCode: purchAcc.code, debit: calc.taxableAmount, credit: 0, description: `Purchase ${billNo}` })
  if (calc.exemptAmount > 0 && purchExemptAcc) voucherLines.push({ accountCode: purchExemptAcc.code, debit: calc.exemptAmount, credit: 0, description: 'Exempt purchase' })
  if (calc.vatAmount > 0 && inputVatAcc) voucherLines.push({ accountCode: inputVatAcc.code, debit: calc.vatAmount, credit: 0, description: 'Input VAT' })
  if (tdsAmount > 0 && tdsAcc) voucherLines.push({ accountCode: tdsAcc.code, debit: 0, credit: tdsAmount, description: `TDS ${effectiveTdsSection}` })
  if (apAcc) voucherLines.push({ accountCode: apAcc.code, debit: 0, credit: netPayable, description: 'Net payable' })

  const existingV = await db.voucher.count({
    where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `JV-${datePart}` } },
  })
  const voucherNo = `JV-${datePart}-${String(existingV + 1).padStart(3, '0')}`
  const totalDebit = voucherLines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = voucherLines.reduce((s, l) => s + l.credit, 0)

  await db.voucher.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      fiscalYearId: fiscalYear?.id,
      voucherNo,
      voucherType: 'PURCHASE',
      bsDate,
      adDate,
      narration: `Purchase bill ${billNo} — ${party.name}`,
      refType: 'PURCHASE_BILL',
      refId: bill.id,
      totalDebit,
      totalCredit,
      status: 'POSTED',
      lines: {
        create: await Promise.all(voucherLines.map(async (l: any) => {
          const acc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: l.accountCode } })
          return {
            accountId: acc!.id,
            debit: l.debit,
            credit: l.credit,
            description: l.description,
          }
        })),
      },
    },
  })

  return NextResponse.json({ bill })
}
