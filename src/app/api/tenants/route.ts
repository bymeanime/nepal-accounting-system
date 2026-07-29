// ============================================================
// API: Tenants — list, create, switch active tenant
// In a real production system this would be tied to NextAuth sessions.
// For this Phase 2 demo, we expose tenant management APIs so accountants
// can manage multiple companies (e.g., one accountant serves 5 clients).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/tenants — list all tenants
export async function GET() {
  const tenants = await db.tenant.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          vouchers: true,
          invoices: true,
          parties: true,
          accounts: true,
        },
      },
    },
  })

  // Get active tenant from a cookie (or default to first)
  const activeTenantId = 'demo-tenant'

  return NextResponse.json({
    activeTenantId,
    tenants: tenants.map(t => ({
      id: t.id,
      name: t.name,
      legalName: t.legalName,
      pan: t.pan,
      vatNumber: t.vatNumber,
      address: t.address,
      district: t.district,
      province: t.province,
      baseCurrency: t.baseCurrency,
      language: t.language,
      stats: {
        vouchers: t._count.vouchers,
        invoices: t._count.invoices,
        parties: t._count.parties,
        accounts: t._count.accounts,
      },
    })),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, legalName, pan, vatNumber, address, municipality, district, province, phone, email, baseCurrency, language } = body

  if (!name || !pan) {
    return NextResponse.json({ error: 'name and pan required' }, { status: 400 })
  }

  const created = await db.tenant.create({
    data: {
      name,
      legalName,
      pan,
      vatNumber: vatNumber || pan,
      address,
      municipality,
      district,
      province,
      phone,
      email,
      baseCurrency: baseCurrency || 'NPR',
      language: language || 'en',
      fyStartBsMonth: 4,
    },
  })

  // Seed default chart of accounts for new tenant (simplified — just top-level groups)
  const topLevelAccounts = [
    { code: '1', name: 'Assets', nameNp: 'सम्पत्ति', type: 'ASSET', subType: '', isGroup: true, sortOrder: 1 },
    { code: '2', name: 'Liabilities', nameNp: 'दायित्व', type: 'LIABILITY', subType: '', isGroup: true, sortOrder: 2 },
    { code: '3', name: 'Equity', nameNp: 'पुँजी', type: 'EQUITY', subType: '', isGroup: true, sortOrder: 3 },
    { code: '4', name: 'Income', nameNp: 'आम्दानी', type: 'INCOME', subType: '', isGroup: true, sortOrder: 4 },
    { code: '5', name: 'Expenses', nameNp: 'खर्च', type: 'EXPENSE', subType: '', isGroup: true, sortOrder: 5 },
  ]
  for (const acc of topLevelAccounts) {
    await db.account.create({
      data: { tenantId: created.id, ...acc, isCash: false, isBank: false },
    })
  }

  // Create current fiscal year for new tenant
  const today = new Date()
  const fy = await import('@/lib/nepaliCalendar').then(m => m.getFiscalYear(today))
  await db.fiscalYear.create({
    data: {
      tenantId: created.id,
      bsYearStart: fy.bsYearStart,
      bsYearEnd: fy.bsYearEnd,
      adStart: fy.startAd,
      adEnd: fy.endAd,
      status: 'OPEN',
    },
  })

  return NextResponse.json({ tenant: created })
}
