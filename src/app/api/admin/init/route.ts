// ============================================================
// API: Admin — Database status & re-seed
// On Vercel: DB is auto-seeded from bundled db/nepal-acct-seeded.db
//   on first request (handled by src/lib/db-server.ts)
// This endpoint just reports status and lets users force a re-seed
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'

export async function GET() {
  try {
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
        ? 'Database is seeded with demo data. Visit the dashboard.'
        : 'Database is empty. Try a hard refresh — the seed DB should auto-copy on next request.',
    })
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      error: err.message,
      message: 'Database not initialized. The bundled seed DB could not be loaded.',
    }, { status: 500 })
  }
}

// Optional: trigger re-seed by deleting the /tmp DB (next request will re-copy)
export async function POST(req: NextRequest) {
  try {
    const fs = await import('fs')
    const tmpDb = '/tmp/nepal-acct.db'
    if (fs.existsSync(tmpDb)) {
      fs.unlinkSync(tmpDb)
    }
    return NextResponse.json({
      success: true,
      message: 'Temporary DB deleted. Next request will re-copy the seeded DB.',
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
