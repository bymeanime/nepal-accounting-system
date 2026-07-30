// ============================================================
// API: Credit Notes (Sales Returns)
// POST /api/credit-notes
// Creates a credit note that reverses a sales invoice:
//   - Dr. Sales (4001) / Dr. Output VAT (2003) — reversal
//   - Cr. Accounts Receivable (1010) — reduce customer balance
//   - Creates stock IN movement (return goods to inventory)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'
import { bsStringToAd, isValidBsDate, adToBsString } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

async function ensureSchema() {
  const ready = await isSchemaInitialized()
  if (!ready) await initializeSchema()
}

export async function GET() {
  try {
    await ensureSchema()
    // Credit notes are vouchers with refType='CREDIT_NOTE'
    const creditNotes = await db.voucher.findMany({
      where: { tenantId: DEMO_TENANT_ID, refType: 'CREDIT_NOTE', status: 'POSTED' },
      orderBy: { adDate: 'desc' },
      include: { lines: { include: { account: true } } },
    })
    return NextResponse.json({ creditNotes })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to load credit notes', detail: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema()
    const body = await req.json()
    const { originalInvoiceId, bsDate, reason, lines } = body

    if (!bsDate || !isValidBsDate(bsDate)) {
      return NextResponse.json({ error: 'Valid BS date required' }, { status: 400 })
    }
    if (!originalInvoiceId) {
      return NextResponse.json({ error: 'Original invoice ID required' }, { status: 400 })
    }
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'At least one return line required' }, { status: 400 })
    }

    const adDate = bsStringToAd(bsDate)
    const original = await db.invoice.findUnique({
      where: { id: originalInvoiceId },
      include: { party: true, lines: true },
    })
    if (!original || original.tenantId !== DEMO_TENANT_ID) {
      return NextResponse.json({ error: 'Original invoice not found' }, { status: 404 })
    }

    // Pre-fetch accounts
    const arAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '1010' } })
    const salesAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '4001' } })
    const outputVatAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '2003' } })
    const inventoryAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '1052' } })
    const cogsAcc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: '5002' } })

    const fiscalYear = await db.fiscalYear.findFirst({
      where: { tenantId: DEMO_TENANT_ID, adStart: { lte: adDate }, adEnd: { gte: adDate } },
    })

    // Compute totals from return lines
    let totalTaxable = 0, totalVat = 0, totalCogs = 0

    for (const line of lines) {
      const qty = Number(line.quantity || 0)
      const rate = Number(line.rate || 0)
      const amount = qty * rate
      const vatRate = Number(line.vatRate || 13)
      totalTaxable += amount
      totalVat += (amount * vatRate) / 100

      // Compute COGS for returned items
      if (line.itemId) {
        const item = await db.item.findFirst({ where: { id: line.itemId, tenantId: DEMO_TENANT_ID } })
        if (item) {
          // Get avg cost from movements
          const movements = await db.inventoryMovement.findMany({
            where: { tenantId: DEMO_TENANT_ID, itemId: item.id },
          })
          let sq = 0, sv = 0
          for (const m of movements) {
            if (m.type === 'IN' || m.type === 'OPENING') { sq += Number(m.quantity); sv += Number(m.value) }
            else if (m.type === 'OUT') { const mq = Math.abs(Number(m.quantity)); const avg = sq > 0 ? sv / sq : Number(item.purchasePrice); sq -= mq; sv -= avg * mq }
          }
          const avgCost = sq > 0 ? sv / sq : Number(item.purchasePrice)
          totalCogs += qty * avgCost
        }
      }
    }

    const totalCredit = totalTaxable + totalVat

    // Execute in transaction
    const datePart = bsDate.replace(/-/g, '')
    const result = await db.$transaction(async (tx) => {
      // 1. Create stock IN movements (return goods to inventory)
      for (const line of lines) {
        if (line.itemId) {
          const item = await tx.item.findFirst({ where: { id: line.itemId, tenantId: DEMO_TENANT_ID } })
          if (item) {
            const qty = Number(line.quantity || 0)
            const movements = await tx.inventoryMovement.findMany({
              where: { tenantId: DEMO_TENANT_ID, itemId: item.id },
            })
            let sq = 0, sv = 0
            for (const m of movements) {
              if (m.type === 'IN' || m.type === 'OPENING') { sq += Number(m.quantity); sv += Number(m.value) }
              else if (m.type === 'OUT') { const mq = Math.abs(Number(m.quantity)); const avg = sq > 0 ? sv / sq : Number(item.purchasePrice); sq -= mq; sv -= avg * mq }
            }
            const avgCost = sq > 0 ? sv / sq : Number(item.purchasePrice)
            await tx.inventoryMovement.create({
              data: {
                tenantId: DEMO_TENANT_ID, itemId: item.id, type: 'IN',
                quantity: Math.abs(qty), rate: avgCost, value: qty * avgCost,
                refType: 'CREDIT_NOTE', bsDate, adDate,
                notes: `Return via credit note for ${original.invoiceNo}`,
              },
            })
          }
        }
      }

      // 2. Create credit note voucher (reverses the sale)
      // Dr. Sales (4001) — reverse revenue
      // Dr. Output VAT (2003) — reverse VAT collected
      // Cr. AR (1010) — reduce customer balance
      // Dr. Inventory (1052) — return goods to inventory
      // Cr. COGS (5002) — reverse cost
      const voucherLines: any[] = []
      if (totalTaxable > 0 && salesAcc) voucherLines.push({ accountId: salesAcc.id, debit: totalTaxable, credit: 0, description: `Sales return — ${original.invoiceNo}` })
      if (totalVat > 0 && outputVatAcc) voucherLines.push({ accountId: outputVatAcc.id, debit: totalVat, credit: 0, description: 'VAT reversal' })
      if (arAcc) voucherLines.push({ accountId: arAcc.id, debit: 0, credit: totalCredit, description: `Credit to ${original.party.name}` })
      if (totalCogs > 0 && inventoryAcc && cogsAcc) {
        voucherLines.push({ accountId: inventoryAcc.id, debit: totalCogs, credit: 0, description: 'Inventory returned' })
        voucherLines.push({ accountId: cogsAcc.id, debit: 0, credit: totalCogs, description: 'COGS reversal' })
      }

      const existing = await tx.voucher.count({
        where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `CN-${datePart}` } },
      })
      const voucherNo = `CN-${datePart}-${String(existing + 1).padStart(3, '0')}`

      const voucher = await tx.voucher.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          fiscalYearId: fiscalYear?.id,
          voucherNo,
          voucherType: 'JOURNAL',
          bsDate, adDate,
          narration: `Credit Note for ${original.invoiceNo} — ${reason || 'Sales return'}`,
          refType: 'CREDIT_NOTE',
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
      creditNoteNo: result.voucherNo,
      originalInvoice: original.invoiceNo,
      totalCredit: totalCredit,
      message: `Credit note ${result.voucherNo} created for invoice ${original.invoiceNo}. Customer balance reduced by NPR ${totalCredit.toLocaleString('en-IN')}.`,
    })
  } catch (err: any) {
    console.error('[credit-notes] error:', err)
    return NextResponse.json({ error: 'Failed to create credit note', detail: err.message }, { status: 500 })
  }
}
