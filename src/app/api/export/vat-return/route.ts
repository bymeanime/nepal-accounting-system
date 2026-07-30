// ============================================================
// API: Export VAT Return as PDF
// GET /api/export/vat-return?period=2083-03
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateVatReturnPdf } from '@/lib/exports'
import { bsMonthRange, formatBsDate, parseBsDate } from '@/lib/nepaliCalendar'
import { computeVatReturn } from '@/lib/taxEngine'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period')

  if (!period) {
    return NextResponse.json({ error: 'period required (e.g., 2083-03)' }, { status: 400 })
  }

  const [y, m] = period.split('-').map(Number)
  const range = bsMonthRange(y, m)
  const startDate = range.startBs
  const endDate = range.endBs

  const tenant = await db.tenant.findUnique({ where: { id: DEMO_TENANT_ID } })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const invoices = await db.invoice.findMany({
    where: {
      tenantId: DEMO_TENANT_ID,
      bsDate: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    },
    include: { party: true },
    orderBy: { bsDate: 'asc' },
  })

  const bills = await db.purchaseBill.findMany({
    where: {
      tenantId: DEMO_TENANT_ID,
      bsDate: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    },
    include: { party: true },
    orderBy: { bsDate: 'asc' },
  })

  const summary = computeVatReturn(
    period,
    invoices.map(i => ({
      taxableAmount: Number(i.taxableAmount),
      vatAmount: Number(i.vatAmount),
      zeroRatedAmount: Number(i.zeroRatedAmount),
      exemptAmount: Number(i.exemptAmount),
    })),
    bills.map(b => ({
      taxableAmount: Number(b.taxableAmount),
      vatAmount: Number(b.vatAmount),
      exemptAmount: Number(b.exemptAmount),
    }))
  )

  const pdf = generateVatReturnPdf({
    tenant: {
      name: tenant.name,
      pan: tenant.pan || '',
      vatNumber: tenant.vatNumber || '',
      address: tenant.address || undefined,
    },
    period,
    periodLabel: formatBsDate(parseBsDate(endDate), 'LONG_EN'),
    summary,
    sales: invoices.map(i => ({
      invoiceNo: i.invoiceNo,
      bsDate: i.bsDate,
      partyName: i.party.name,
      partyPan: i.party.pan || '',
      invoiceType: i.invoiceType,
      taxableAmount: Number(i.taxableAmount),
      vatAmount: Number(i.vatAmount),
      zeroRatedAmount: Number(i.zeroRatedAmount),
      exemptAmount: Number(i.exemptAmount),
      totalAmount: Number(i.totalAmount),
    })),
    purchases: bills.map(b => ({
      billNo: b.billNo,
      bsDate: b.bsDate,
      partyName: b.party.name,
      partyPan: b.party.pan || '',
      vendorBillNo: b.vendorBillNo || '',
      taxableAmount: Number(b.taxableAmount),
      vatAmount: Number(b.vatAmount),
      tdsSection: b.tdsSection || '',
      tdsAmount: Number(b.tdsAmount),
      totalAmount: Number(b.totalAmount),
    })),
  })

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="VAT-Return-${period}.pdf"`,
    },
  })
}
