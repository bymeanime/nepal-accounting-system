// ============================================================
// API: VAT Return (Form V48)
// GET — compute VAT return for a given BS month period
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseBsDate, bsMonthRange, formatBsDate, parseFiscalYearLabel } from '@/lib/nepaliCalendar'
import { computeVatReturn, VatReturnData } from '@/lib/taxEngine'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') // "2082-04"
  const startBs = searchParams.get('startBs')
  const endBs = searchParams.get('endBs')

  let startDate: string
  let endDate: string

  if (period) {
    // period = "2082-04"
    const [y, m] = period.split('-').map(Number)
    const range = bsMonthRange(y, m)
    startDate = range.startBs
    endDate = range.endBs
  } else if (startBs && endBs) {
    startDate = startBs
    endDate = endBs
  } else {
    return NextResponse.json({ error: 'Provide "period" (e.g., 2082-04) OR "startBs" + "endBs"' }, { status: 400 })
  }

  // Fetch invoices in range
  const invoices = await db.invoice.findMany({
    where: {
      tenantId: DEMO_TENANT_ID,
      bsDate: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    },
    orderBy: { bsDate: 'asc' },
    include: { party: true },
  })

  // Fetch purchase bills in range
  const bills = await db.purchaseBill.findMany({
    where: {
      tenantId: DEMO_TENANT_ID,
      bsDate: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    },
    orderBy: { bsDate: 'asc' },
    include: { party: true },
  })

  const vatData = computeVatReturn(
    period || startDate.slice(0, 7),
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

  // Find current FY
  const tenant = await db.tenant.findUnique({ where: { id: DEMO_TENANT_ID } })
  const fyLabel = tenant ? `${2082}/${83}` : '2082/83' // simplify for now

  return NextResponse.json({
    period: period || startDate.slice(0, 7),
    periodLabel: period ? formatBsDate(parseBsDate(endDate), 'LONG_EN') : `${startDate} → ${endDate}`,
    tenant: {
      name: tenant?.name,
      pan: tenant?.pan,
      vatNumber: tenant?.vatNumber,
    },
    sales: invoices.map(i => ({
      invoiceNo: i.invoiceNo,
      bsDate: i.bsDate,
      partyName: i.party.name,
      partyPan: i.party.pan,
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
      partyPan: b.party.pan,
      vendorBillNo: b.vendorBillNo,
      taxableAmount: Number(b.taxableAmount),
      vatAmount: Number(b.vatAmount),
      tdsSection: b.tdsSection,
      tdsAmount: Number(b.tdsAmount),
      totalAmount: Number(b.totalAmount),
    })),
    summary: vatData,
    filingDeadline: `25th of following BS month`,
  })
}
