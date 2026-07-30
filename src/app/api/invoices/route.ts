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
  try {
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

  // Compute VAT to check ABBREVIATED invoice limit
  const calc = calculateVat(lines.map((l: any) => ({
    amount: Number(l.amount),
    vatRate: Number(l.vatRate || 13),
    isExempt: l.isExempt || invoiceType === 'EXEMPT',
    isZeroRated: l.isZeroRated || invoiceType === 'EXPORT',
  })))

  // Enforce ABBREVIATED invoice limit (Nepal VAT Rule 17: max NPR 5,000 per invoice for retail)
  if (invoiceType === 'ABBREVIATED' && calc.totalAmount > 5000) {
    return NextResponse.json({
      error: `Abbreviated tax invoice cannot exceed NPR 5,000 per Nepal VAT Rule 17. Current total: NPR ${calc.totalAmount}. Please use TAX_INVOICE type instead.`,
    }, { status: 400 })
  }

  const fiscalYear = await db.fiscalYear.findFirst({
    where: { tenantId: DEMO_TENANT_ID, adStart: { lte: adDate }, adEnd: { gte: adDate } },
  })

  // Generate invoice no: INV-YYYYMMDD-XXX
  const datePart = bsDate.replace(/-/g, '')
  const existing = await db.invoice.count({
    where: { tenantId: DEMO_TENANT_ID, invoiceNo: { startsWith: `INV-${datePart}` } },
  })
  const invoiceNo = `INV-${datePart}-${String(existing + 1).padStart(3, '0')}`

  // QR data: Nepal IRD-compliant invoice QR (simplified — contains key fields)
  const tenantRecord = await db.tenant.findUnique({ where: { id: DEMO_TENANT_ID } })
  const qrData = JSON.stringify({
    invoice_no: invoiceNo,
    date: bsDate,
    seller_pan: tenantRecord?.pan,
    buyer_pan: panBuyer || party.pan,
    total: calc.totalAmount,
    vat: calc.vatAmount,
  })

  // Pre-fetch all accounts needed for voucher posting
  const arAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '1010' } })
  const salesTaxableAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '4001' } })
  const salesZeroAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '4002' } })
  const salesExemptAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '4003' } })
  const outputVatAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '2003' } })
  const cogsAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '5002' } })
  const inventoryAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '1052' } })

  // Execute everything in a single transaction for data integrity
  const invoice = await db.$transaction(async (tx) => {
    // 1. Create invoice + lines
    const inv = await tx.invoice.create({
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
          create: lines.map((l: any) => {
            const lineVatRate = (invoiceType === 'EXPORT' || invoiceType === 'EXEMPT' || l.isExempt || l.isZeroRated) ? 0 : Number(l.vatRate || 13)
            const lineTaxableAmount = (invoiceType === 'EXPORT' || invoiceType === 'EXEMPT') ? 0 : Number(l.amount)
            const lineVatAmount = (lineTaxableAmount * lineVatRate) / 100
            const lineExemptOrZero = (invoiceType === 'EXPORT' || invoiceType === 'EXEMPT') ? Number(l.amount) : 0
            return {
              description: l.description,
              quantity: Number(l.quantity || 1),
              unit: l.unit || 'PCS',
              rate: Number(l.rate || 0),
              taxableAmount: lineTaxableAmount,
              vatRate: lineVatRate,
              vatAmount: lineVatAmount,
              totalAmount: lineTaxableAmount + lineVatAmount + lineExemptOrZero,
            }
          }),
        },
      },
      include: { lines: true, party: true },
    })

    // 2. Create stock OUT movements + compute COGS for each line with an itemId
    let totalCogs = 0
    for (const line of lines) {
      if (line.itemId) {
        const item = await tx.item.findFirst({ where: { id: line.itemId, tenantId: DEMO_TENANT_ID } })
        if (item) {
          const qty = Number(line.quantity || 1)
          // Compute weighted average cost from inventory movements
          const movements = await tx.inventoryMovement.findMany({
            where: { tenantId: DEMO_TENANT_ID, itemId: item.id },
          })
          let stockQty = 0, stockVal = 0
          for (const m of movements) {
            if (m.type === 'IN' || m.type === 'OPENING') { stockQty += Number(m.quantity); stockVal += Number(m.value) }
            else if (m.type === 'OUT') { const mq = Math.abs(Number(m.quantity)); const avg = stockQty > 0 ? stockVal / stockQty : Number(item.purchasePrice); stockQty -= mq; stockVal -= avg * mq }
          }
          const avgCost = stockQty > 0 ? stockVal / stockQty : Number(item.purchasePrice)
          const cogsAmount = qty * avgCost
          totalCogs += cogsAmount

          await tx.inventoryMovement.create({
            data: {
              tenantId: DEMO_TENANT_ID,
              itemId: item.id,
              type: 'OUT',
              quantity: -Math.abs(qty),
              rate: avgCost,
              value: cogsAmount,
              refType: 'INVOICE',
              refId: inv.id,
              bsDate,
              adDate,
              notes: `Sold via ${invoiceNo}`,
            },
          })
        }
      }
    }

    // 3. Create sales voucher: Dr. AR, Cr. Sales + Output VAT
    const voucherLines: any[] = []
    if (arAcc) voucherLines.push({ accountId: arAcc.id, debit: calc.totalAmount, credit: 0, description: `Invoice ${invoiceNo}` })
    if (calc.taxableAmount > 0 && salesTaxableAcc) voucherLines.push({ accountId: salesTaxableAcc.id, debit: 0, credit: calc.taxableAmount, description: 'Taxable sales' })
    if (calc.zeroRatedAmount > 0 && salesZeroAcc) voucherLines.push({ accountId: salesZeroAcc.id, debit: 0, credit: calc.zeroRatedAmount, description: 'Zero-rated sales' })
    if (calc.exemptAmount > 0 && salesExemptAcc) voucherLines.push({ accountId: salesExemptAcc.id, debit: 0, credit: calc.exemptAmount, description: 'Exempt sales' })
    if (calc.vatAmount > 0 && outputVatAcc) voucherLines.push({ accountId: outputVatAcc.id, debit: 0, credit: calc.vatAmount, description: 'Output VAT' })

    // 4. Add COGS entry: Dr. COGS (5002), Cr. Inventory (1052) — only if items with stock
    if (totalCogs > 0 && cogsAcc && inventoryAcc) {
      voucherLines.push({ accountId: cogsAcc.id, debit: totalCogs, credit: 0, description: 'COGS — cost of goods sold' })
      voucherLines.push({ accountId: inventoryAcc.id, debit: 0, credit: totalCogs, description: 'Inventory issued' })
    }

    const existingV = await tx.voucher.count({
      where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `SV-${datePart}` } },
    })
    const voucherNo = `SV-${datePart}-${String(existingV + 1).padStart(3, '0')}`
    const totalDebit = voucherLines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = voucherLines.reduce((s, l) => s + l.credit, 0)

    await tx.voucher.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        fiscalYearId: fiscalYear?.id,
        voucherNo,
        voucherType: 'SALES',
        bsDate,
        adDate,
        narration: `Sales invoice ${invoiceNo} — ${party.name}`,
        refType: 'INVOICE',
        refId: inv.id,
        totalDebit,
        totalCredit,
        status: 'POSTED',
        lines: { create: voucherLines },
      },
    })

    return inv
  })

  return NextResponse.json({ invoice })
  } catch (err: any) {
    console.error('[invoices] POST error:', err)
    return NextResponse.json({
      error: 'Failed to create invoice',
      detail: err.message,
      code: err.code,
    }, { status: 500 })
  }
}
