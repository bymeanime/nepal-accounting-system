// ============================================================
// API: Vouchers — Journal entries (double-entry)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'
import { bsStringToAd, isValidBsDate } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

async function ensureSchema() {
  const ready = await isSchemaInitialized()
  if (!ready) await initializeSchema()
}

export async function GET(req: NextRequest) {
  try {
    await ensureSchema()
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const vouchers = await db.voucher.findMany({
      where: { tenantId: DEMO_TENANT_ID },
      orderBy: { adDate: 'desc' },
      take: limit,
      include: {
        lines: {
          include: { account: true },
          orderBy: { id: 'asc' },
        },
      },
    })
    return NextResponse.json({ vouchers })
  } catch (err: any) {
    console.error('[vouchers] GET error:', err)
    return NextResponse.json({ error: 'Failed to load vouchers', detail: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema()
    const body = await req.json()
    const { voucherType, bsDate, narration, lines } = body

    if (!bsDate || !isValidBsDate(bsDate)) {
      return NextResponse.json({ error: 'Invalid BS date' }, { status: 400 })
    }
    if (!lines || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json({ error: 'At least 2 voucher lines required' }, { status: 400 })
    }

    const totalDebit = lines.reduce((sum: number, l: any) => sum + Number(l.debit || 0), 0)
    const totalCredit = lines.reduce((sum: number, l: any) => sum + Number(l.credit || 0), 0)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: `Debit (${totalDebit}) must equal Credit (${totalCredit})` }, { status: 400 })
    }

    const adDate = bsStringToAd(bsDate)
    const fiscalYear = await db.fiscalYear.findFirst({
      where: {
        tenantId: DEMO_TENANT_ID,
        adStart: { lte: adDate },
        adEnd: { gte: adDate },
      },
    })

    const datePart = bsDate.replace(/-/g, '')
    const existing = await db.voucher.count({
      where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `JV-${datePart}` } },
    })
    const voucherNo = `JV-${datePart}-${String(existing + 1).padStart(3, '0')}`

    for (const line of lines) {
      const acc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: line.accountCode } })
      if (!acc) {
        return NextResponse.json({ error: `Account ${line.accountCode} not found` }, { status: 400 })
      }
    }

    const voucher = await db.voucher.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        fiscalYearId: fiscalYear?.id,
        voucherNo,
        voucherType: voucherType || 'JOURNAL',
        bsDate,
        adDate,
        narration,
        totalDebit,
        totalCredit,
        status: 'POSTED',
        lines: {
          create: await Promise.all(lines.map(async (l: any) => {
            const acc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: l.accountCode } })
            return {
              accountId: acc!.id,
              debit: Number(l.debit || 0),
              credit: Number(l.credit || 0),
              description: l.description,
            }
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    })

    return NextResponse.json({ voucher })
  } catch (err: any) {
    console.error('[vouchers] POST error:', err)
    return NextResponse.json({
      error: 'Failed to create voucher',
      detail: err.message,
      code: err.code,
    }, { status: 500 })
  }
}
