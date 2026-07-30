// ============================================================
// API: Invoices — Sales (VAT-compliant)
// POST creates an invoice with lines + auto-creates sales voucher
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bsStringToAd, isValidBsDate } from '@/lib/nepaliCalendar'
import { calculateVat } from '@/lib/taxEngine'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  const invoices = await db.invoice.findMany({
    where: { tenantId: DEMO_TENANT_ID },
    orderBy: { adDate: 'desc' },
    take: limit,
    include: {
      party: true,
      lines: true,
    },
  })
  return NextResponse.json({ invoices })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { bsDate, partyId, panBuyer, invoiceType, lines, notes, dueDate } = body

  if (!bsDate || !isValidBsDate(bsDate)) {
    return NextResponse.json({ error: 'Invalid BS date' }, { status: 400 })
  }
  if (!partyId) {
    return NextResponse.json({ error: 'Party is required' }, { status: 400 })
  }
  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: 'At least one line item required' }, { status: 400 })
  }

  const adDate = bsStringToAd(bsDate)
  const party = await db.party.findFirst({ where: { id: partyId, tenantId: DEMO_TENANT_ID } })
  if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 400 })

  const fiscalYear = await db.fiscalYear.findFirst({
    where: { tenantId: DEMO_TENANT_ID, adStart: { lte: adDate }, adEnd: { gte: adDate } },
  })

  // Compute VAT
  const calc = calculateVat(lines.map((l: any) => ({
    amount: Number(l.amount),
    vatRate: Number(l.vatRate || 13),
    isExempt: l.isExempt || invoiceType === 'EXEMPT',
    isZeroRated: l.isZeroRated || invoiceType === 'EXPORT',
  })))

  // Generate invoice no: INV-YYYYMMDD-XXX
  const datePart = bsDate.replace(/-/g, '')
  const existing = await db.invoice.count({
    where: { tenantId: DEMO_TENANT_ID, invoiceNo: { startsWith: `INV-${datePart}` } },
  })
  const invoiceNo = `INV-${datePart}-${String(existing + 1).padStart(3, '0')}`

  // QR data: Nepal IRD-compliant invoice QR (simplified — contains key fields)
  const qrData = JSON.stringify({
    invoice_no: invoiceNo,
    date: bsDate,
    seller_pan: (await db.tenant.findUnique({ where: { id: DEMO_TENANT_ID } }))?.pan,
    buyer_pan: panBuyer || party.pan,
    total: calc.totalAmount,
    vat: calc.vatAmount,
  })

  // Create invoice
  const invoice = await db.invoice.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      fiscalYearId: fiscalYear?.id,
      invoiceNo,
      invoiceType: invoiceType || 'TAX_INVOICE',
      bsDate,
      adDate,
      partyId,
      panBuyer: panBuyer || party.pan,
      subtotal: calc.subtotal,
      discountAmount: calc.discountAmount,
      taxableAmount: calc.taxableAmount,
      vatAmount: calc.vatAmount,
      zeroRatedAmount: calc.zeroRatedAmount,
      exemptAmount: calc.exemptAmount,
      totalAmount: calc.totalAmount,
      currency: 'NPR',
      exchangeRate: 1,
      status: 'UNPAID',
      dueDate: dueDate ? bsStringToAd(dueDate) : null,
      notes,
      qrData,
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

  // Auto-create stock movements (reduce inventory for each line item that has an itemId)
  for (const line of lines) {
    if (line.itemId) {
      const item = await db.item.findFirst({ where: { id: line.itemId, tenantId: DEMO_TENANT_ID } })
      if (item) {
        const qty = Number(line.quantity || 1)
        const rate = Number(line.rate || 0)
        await db.inventoryMovement.create({
          data: {
            tenantId: DEMO_TENANT_ID,
            itemId: item.id,
            type: 'OUT',
            quantity: -Math.abs(qty), // negative for OUT
            rate,
            value: qty * rate,
            refType: 'INVOICE',
            refId: invoice.id,
            bsDate,
            adDate,
            notes: `Sold via ${invoiceNo}`,
          },
        })
      }
    }
  }

  // Create accounting voucher (auto-post)
  // Dr. Accounts Receivable (1010) — total
  // Cr. Sales Taxable (4001) — taxableAmount
  // Cr. Output VAT (2003) — vatAmount
  // Cr. Sales Zero Rated (4002) — zeroRated (if any)
  // Cr. Sales Exempt (4003) — exemptAmount (if any)

  const arAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '1010' } })
  const salesTaxableAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '4001' } })
  const salesZeroAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '4002' } })
  const salesExemptAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '4003' } })
  const outputVatAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '2003' } })

  const voucherLines: any[] = []
  if (arAcc) voucherLines.push({ accountCode: arAcc.code, debit: calc.totalAmount, credit: 0, description: `Invoice ${invoiceNo}` })
  if (calc.taxableAmount > 0 && salesTaxableAcc) voucherLines.push({ accountCode: salesTaxableAcc.code, debit: 0, credit: calc.taxableAmount, description: 'Taxable sales' })
  if (calc.zeroRatedAmount > 0 && salesZeroAcc) voucherLines.push({ accountCode: salesZeroAcc.code, debit: 0, credit: calc.zeroRatedAmount, description: 'Zero-rated sales' })
  if (calc.exemptAmount > 0 && salesExemptAcc) voucherLines.push({ accountCode: salesExemptAcc.code, debit: 0, credit: calc.exemptAmount, description: 'Exempt sales' })
  if (calc.vatAmount > 0 && outputVatAcc) voucherLines.push({ accountCode: outputVatAcc.code, debit: 0, credit: calc.vatAmount, description: 'Output VAT' })

  // Post voucher
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
      voucherType: 'SALES',
      bsDate,
      adDate,
      narration: `Sales invoice ${invoiceNo} — ${party.name}`,
      refType: 'INVOICE',
      refId: invoice.id,
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

  return NextResponse.json({ invoice })
}
