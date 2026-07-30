// ============================================================
// API: Export invoice as PDF
// GET /api/export/invoice?id=xxx
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateInvoicePdf } from '@/lib/exports'
import { formatBsDate, parseBsDate } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const invoiceId = searchParams.get('id')

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

  const tenant = await db.tenant.findUnique({ where: { id: DEMO_TENANT_ID } })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const pdf = generateInvoicePdf({
    tenant: {
      name: tenant.name,
      pan: tenant.pan || '',
      vatNumber: tenant.vatNumber || '',
      address: tenant.address || undefined,
      phone: tenant.phone || undefined,
      email: tenant.email || undefined,
      municipality: tenant.municipality || undefined,
      district: tenant.district || undefined,
      province: tenant.province || undefined,
    },
    invoice: {
      invoiceNo: invoice.invoiceNo,
      bsDate: invoice.bsDate,
      adDate: invoice.adDate.toISOString().split('T')[0],
      partyName: invoice.party.name,
      partyPan: invoice.panBuyer || invoice.party.pan || '',
      partyAddress: invoice.party.address || undefined,
      invoiceType: invoice.invoiceType,
      subtotal: Number(invoice.subtotal),
      discountAmount: Number(invoice.discountAmount),
      taxableAmount: Number(invoice.taxableAmount),
      vatAmount: Number(invoice.vatAmount),
      zeroRatedAmount: Number(invoice.zeroRatedAmount),
      exemptAmount: Number(invoice.exemptAmount),
      totalAmount: Number(invoice.totalAmount),
      notes: invoice.notes,
      qrData: invoice.qrData,
    },
    lines: invoice.lines.map(l => ({
      description: l.description,
      quantity: Number(l.quantity),
      unit: l.unit || 'PCS',
      rate: Number(l.rate),
      taxableAmount: Number(l.taxableAmount),
      vatRate: Number(l.vatRate),
      vatAmount: Number(l.vatAmount),
      totalAmount: Number(l.totalAmount),
    })),
  })

  const safeName = invoice.invoiceNo.replace(/[^a-zA-Z0-9-]/g, '_')
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeName}.pdf"`,
    },
  })
}
