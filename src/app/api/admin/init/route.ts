// ============================================================
// API: Admin — Initialize database on Vercel deployment
// GET  /api/admin/init — report DB status (tables + counts)
// POST /api/admin/init?action=init — create schema only
// POST /api/admin/init?action=seed — create schema + run all seeders
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { initializeSchema, isSchemaInitialized } from '@/lib/schema-init'

export async function GET() {
  try {
    const schemaReady = await isSchemaInitialized()
    if (!schemaReady) {
      return NextResponse.json({
        status: 'needs_init',
        message: 'Database has no tables. POST /api/admin/init?action=seed to initialize.',
      })
    }

    const tenantCount = await db.tenant.count()
    const accountCount = await db.account.count()
    const voucherCount = await db.voucher.count()
    const invoiceCount = await db.invoice.count()
    const partyCount = await db.party.count()

    return NextResponse.json({
      status: 'ok',
      database: {
        tenants: tenantCount,
        accounts: accountCount,
        vouchers: voucherCount,
        invoices: invoiceCount,
        parties: partyCount,
      },
      seeded: tenantCount > 0,
      message: tenantCount > 0
        ? 'Database is seeded with demo data.'
        : 'Schema ready but no data. POST /api/admin/init?action=seed to load demo data.',
    })
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      error: err.message,
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const action = url.searchParams.get('action') || 'seed'
  const steps: string[] = []

  try {
    // Handle reset action — drop all tables, then re-init
    if (action === 'reset') {
      try {
        await db.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`)
        const tables = await db.$queryRawUnsafe<{name: string}[]>(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'`)
        for (const t of tables) {
          await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${t.name}"`)
        }
        await db.$executeRawUnsafe(`PRAGMA foreign_keys = ON`)
        steps.push(`Dropped ${tables.length} tables`)
      } catch (err: any) {
        steps.push(`Reset warning: ${err.message}`)
      }
    }

    // Step 1: Initialize schema (CREATE TABLE IF NOT EXISTS for all 18 tables)
    const schemaResult = await initializeSchema()
    if (!schemaResult.success) {
      return NextResponse.json({
        success: false,
        action,
        steps: [...steps, `Schema init failed: ${schemaResult.message}`],
        error: schemaResult.message,
      }, { status: 500 })
    }
    steps.push(`Schema ready — ${schemaResult.tablesCreated} tables ensured`)

    // Step 2: If action=seed, also run all demo data seeders
    if (action === 'seed' || action === 'reset') {
      const tenantCount = await db.tenant.count()
      if (tenantCount > 0 && action === 'seed') {
        steps.push(`Database already has ${tenantCount} tenants — skipping seed (use action=reset to re-seed)`)
        return NextResponse.json({
          success: true,
          action,
          steps,
          message: 'Database already seeded. Use POST /api/admin/init?action=reset to clear and re-seed.',
        })
      }

      const { runSeeders } = await import('@/lib/runtime-seeders')
      const result = await runSeeders()
      steps.push(`Seeders completed: ${result.tenantsCreated} tenants, ${result.accountsCreated} accounts, ${result.vouchersCreated} vouchers`)
      steps.push(`Demo tenant: ${result.demoTenantName}`)
      steps.push(`Demo login: ${result.demoEmail}`)
    }

    return NextResponse.json({
      success: true,
      action,
      steps,
      message: action === 'seed' || action === 'reset'
        ? 'Database initialized and seeded. Visit the dashboard to see demo data.'
        : 'Schema initialized. Call /api/admin/init?action=seed to load demo data.',
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      action,
      steps,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }, { status: 500 })
  }
}
