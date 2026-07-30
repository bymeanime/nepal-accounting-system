// ============================================================
// API: Organization Settings
// GET  /api/settings — get current tenant's settings
// PUT  /api/settings — update tenant settings (name, address, PAN, VAT, etc.)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'

const DEMO_TENANT_ID = 'demo-tenant'

async function ensureSchema() {
  const ready = await isSchemaInitialized()
  if (!ready) await initializeSchema()
}

export async function GET() {
  try {
    await ensureSchema()
    const tenant = await db.tenant.findUnique({ where: { id: DEMO_TENANT_ID } })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get fiscal years
    const fiscalYears = await db.fiscalYear.findMany({
      where: { tenantId: DEMO_TENANT_ID },
      orderBy: { bsYearStart: 'desc' },
    })

    // Get tax rules summary
    const taxRules = await db.taxRule.findMany({
      where: { tenantId: DEMO_TENANT_ID },
      orderBy: [{ taxType: 'asc' }, { section: 'asc' }],
    })

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        legalName: tenant.legalName,
        pan: tenant.pan,
        vatNumber: tenant.vatNumber,
        exciseNumber: tenant.exciseNumber,
        ssfNumber: tenant.ssfNumber,
        phone: tenant.phone,
        email: tenant.email,
        address: tenant.address,
        municipality: tenant.municipality,
        district: tenant.district,
        province: tenant.province,
        baseCurrency: tenant.baseCurrency,
        fyStartBsMonth: tenant.fyStartBsMonth,
        language: tenant.language,
        logoUrl: tenant.logoUrl,
      },
      fiscalYears: fiscalYears.map(fy => ({
        id: fy.id,
        label: `${fy.bsYearStart}/${String(fy.bsYearEnd).slice(-2)}`,
        bsYearStart: fy.bsYearStart,
        bsYearEnd: fy.bsYearEnd,
        status: fy.status,
      })),
      taxRulesCount: taxRules.length,
      taxRulesByType: {
        VAT: taxRules.filter(r => r.taxType === 'VAT').length,
        TDS: taxRules.filter(r => r.taxType === 'TDS').length,
        SSF: taxRules.filter(r => r.taxType === 'SSF').length,
        INCOME_TAX: taxRules.filter(r => r.taxType === 'INCOME_TAX').length,
      },
    })
  } catch (err: any) {
    console.error('[settings] GET error:', err)
    return NextResponse.json({ error: 'Failed to load settings', detail: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureSchema()
    const body = await req.json()
    const {
      name, legalName, pan, vatNumber, exciseNumber, ssfNumber,
      phone, email, address, municipality, district, province,
      baseCurrency, language,
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    const updated = await db.tenant.update({
      where: { id: DEMO_TENANT_ID },
      data: {
        name,
        legalName,
        pan,
        vatNumber,
        exciseNumber,
        ssfNumber,
        phone,
        email,
        address,
        municipality,
        district,
        province,
        baseCurrency: baseCurrency || 'NPR',
        language: language || 'en',
      },
    })

    return NextResponse.json({
      success: true,
      tenant: updated,
      message: `Organization settings updated for "${name}"`,
    })
  } catch (err: any) {
    console.error('[settings] PUT error:', err)
    return NextResponse.json({
      error: 'Failed to update settings',
      detail: err.message,
      code: err.code,
    }, { status: 500 })
  }
}
