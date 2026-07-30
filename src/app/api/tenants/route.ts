// ============================================================
// API: Tenants — list, create, switch active tenant
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'

// GET /api/tenants — list all tenants
export async function GET() {
  try {
    // Auto-init schema if missing
    const schemaReady = await isSchemaInitialized()
    if (!schemaReady) {
      await initializeSchema()
      return NextResponse.json({ activeTenantId: 'demo-tenant', tenants: [] })
    }

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
  } catch (err: any) {
    console.error('[tenants] GET error:', err)
    return NextResponse.json({
      error: 'Failed to load tenants',
      detail: err.message,
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Auto-init schema if missing
    const schemaReady = await isSchemaInitialized()
    if (!schemaReady) {
      const initResult = await initializeSchema()
      if (!initResult.success) {
        return NextResponse.json({
          error: 'Database schema not initialized',
          detail: initResult.message,
          hint: 'POST /api/admin/init?action=seed to initialize the database first.',
        }, { status: 500 })
      }
    }

    const body = await req.json()
    const { name, legalName, pan, vatNumber, address, municipality, district, province, phone, email, baseCurrency, language } = body

    if (!name || !pan) {
      return NextResponse.json({ error: 'name and pan required' }, { status: 400 })
    }

    // Generate tenant ID
    const tenantId = `tenant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const created = await db.tenant.create({
      data: {
        id: tenantId,
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

    // Seed default chart of accounts for new tenant (just top-level groups)
    const topLevelAccounts = [
      { code: '1', name: 'Assets', nameNp: 'सम्पत्ति', type: 'ASSET', subType: '', isGroup: true, sortOrder: 1 },
      { code: '2', name: 'Liabilities', nameNp: 'दायित्व', type: 'LIABILITY', subType: '', isGroup: true, sortOrder: 2 },
      { code: '3', name: 'Equity', nameNp: 'पुँजी', type: 'EQUITY', subType: '', isGroup: true, sortOrder: 3 },
      { code: '4', name: 'Income', nameNp: 'आम्दानी', type: 'INCOME', subType: '', isGroup: true, sortOrder: 4 },
      { code: '5', name: 'Expenses', nameNp: 'खर्च', type: 'EXPENSE', subType: '', isGroup: true, sortOrder: 5 },
    ]
    for (const acc of topLevelAccounts) {
      await db.account.create({
        data: {
          id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          tenantId: created.id, ...acc, isCash: false, isBank: false,
        },
      })
    }

    // Create current fiscal year for new tenant
    const today = new Date()
    const fy = await import('@/lib/nepaliCalendar').then(m => m.getFiscalYear(today))
    await db.fiscalYear.create({
      data: {
        id: `fy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tenantId: created.id,
        bsYearStart: fy.bsYearStart,
        bsYearEnd: fy.bsYearEnd,
        adStart: fy.startAd,
        adEnd: fy.endAd,
        status: 'OPEN',
      },
    })

    return NextResponse.json({
      tenant: created,
      message: `Company "${name}" created with default chart of accounts and current fiscal year ${fy.label}`,
    })
  } catch (err: any) {
    console.error('[tenants] POST error:', err)
    return NextResponse.json({
      error: 'Failed to create company',
      detail: err.message,
      code: err.code,
    }, { status: 500 })
  }
}
