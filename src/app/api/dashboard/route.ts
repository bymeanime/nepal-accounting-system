// ============================================================
// API: Dashboard summary
// Returns cash position, receivables, payables, tax liability,
// recent vouchers, current FY info — all in NPR
// ============================================================

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'
import { getFiscalYear, adToBsString, formatBsDate, parseBsDate } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET() {
  try {
    // Auto-init schema if missing (Vercel cold start with empty /tmp DB)
    const schemaReady = await isSchemaInitialized()
    if (!schemaReady) {
      // Try to initialize schema first
      const initResult = await initializeSchema()
      if (!initResult.success) {
        return NextResponse.json({
          error: 'Database not initialized',
          hint: 'POST /api/admin/init?action=seed to initialize the database with demo data.',
        }, { status: 503 })
      }
      // Auto-seed if schema was just created and is empty
      const { runSeeders } = await import('@/lib/runtime-seeders')
      await runSeeders()
    }

    const tenant = await db.tenant.findUnique({ where: { id: DEMO_TENANT_ID } })
    if (!tenant) {
      // Auto-seed if tenant is missing (cold start scenario)
      const { runSeeders } = await import('@/lib/runtime-seeders')
      await runSeeders()
      const reTried = await db.tenant.findUnique({ where: { id: DEMO_TENANT_ID } })
      if (!reTried) {
        return NextResponse.json({ error: 'Tenant not found and auto-seed failed' }, { status: 404 })
      }
      return NextResponse.json(await buildDashboardResponse(reTried))
    }

    return NextResponse.json(await buildDashboardResponse(tenant))
  } catch (err: any) {
    console.error('[dashboard] error:', err)
    return NextResponse.json({
      error: 'Failed to load dashboard',
      detail: err.message,
      hint: 'Try POST /api/admin/init?action=seed to initialize the database.',
    }, { status: 500 })
  }
}

async function buildDashboardResponse(tenant: any) {
  const today = new Date()
  const fy = getFiscalYear(today)
  const todayBs = adToBsString(today)

  const fiscalYear = await db.fiscalYear.findFirst({
    where: { tenantId: tenant.id, bsYearStart: fy.bsYearStart },
  })

  // === OPTIMIZED: Single groupBy query for ALL account balances ===
  // Instead of 170+ queries (one per account), we do 2 queries total:
  // 1. Sum all voucher lines grouped by accountId
  // 2. Get all account opening balances
  const [balances, accounts] = await Promise.all([
    db.voucherLine.groupBy({
      by: ['accountId'],
      where: { voucher: { tenantId: tenant.id, status: 'POSTED' } },
      _sum: { debit: true, credit: true },
    }),
    db.account.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, code: true, type: true, isCash: true, isBank: true, isGroup: true, openingBalance: true, name: true },
    }),
  ])

  // Build lookup maps
  const accountById = new Map(accounts.map(a => [a.id, a]))
  const accountByCode = new Map(accounts.map(a => [a.code, a]))
  const balanceByAccount = new Map<string, number>()

  for (const b of balances) {
    const acc = accountById.get(b.accountId)
    if (!acc) continue
    const opening = Number(acc.openingBalance)
    const netMovement = Number(b._sum.debit || 0) - Number(b._sum.credit || 0)
    balanceByAccount.set(b.accountId, opening + netMovement)
  }

  // Helper to get balance by account code
  function balanceByCode(code: string): number {
    const acc = accountByCode.get(code)
    if (!acc) return 0
    return balanceByAccount.get(acc.id) || 0
  }

  // Helper to sum balances for a set of accounts (by filter)
  function sumBalances(filter: (acc: any) => boolean): number {
    let total = 0
    for (const acc of accounts) {
      if (filter(acc)) {
        total += balanceByAccount.get(acc.id) || 0
      }
    }
    return total
  }

  // Compute all dashboard metrics from the in-memory maps
  const cashBalance = sumBalances(a => a.isCash)
  const bankBalance = sumBalances(a => a.isBank)
  const arBalance = balanceByCode('1010')
  const apBalance = Math.abs(balanceByCode('2001'))
  const outputVat = Math.abs(balanceByCode('2003'))
  const inputVat = Math.abs(balanceByCode('1040'))
  const tdsPayable = Math.abs(balanceByCode('2004'))
  const ssfPayable = Math.abs(balanceByCode('2005'))

  // FY income = sum of all INCOME account balances (credit balances → negative, so abs)
  let fyIncome = 0
  let fyExpense = 0
  for (const acc of accounts) {
    if (acc.isGroup) continue
    const bal = balanceByAccount.get(acc.id) || 0
    if (acc.type === 'INCOME') fyIncome += Math.abs(bal)
    if (acc.type === 'EXPENSE') fyExpense += Math.abs(bal)
  }
  const netProfit = fyIncome - fyExpense

  const recentVouchers = await db.voucher.findMany({
    where: { tenantId: tenant.id, status: 'POSTED' },
    orderBy: { adDate: 'desc' },
    take: 8,
    select: { id: true, voucherNo: true, voucherType: true, bsDate: true, narration: true, totalDebit: true, totalCredit: true, status: true },
  })

  const recentInvoices = await db.invoice.findMany({
    where: { tenantId: tenant.id },
    orderBy: { adDate: 'desc' },
    take: 5,
    include: { party: true },
  })

  return {
    tenant: {
      name: tenant.name,
      pan: tenant.pan,
      vatNumber: tenant.vatNumber,
      address: tenant.address,
      municipality: tenant.municipality,
      district: tenant.district,
      province: tenant.province,
      phone: tenant.phone,
      email: tenant.email,
    },
    today: {
      bs: todayBs,
      bsLong: formatBsDate(parseBsDate(todayBs), 'LONG_EN'),
      ad: today.toISOString().split('T')[0],
      weekday: today.toLocaleDateString('en-US', { weekday: 'long' }),
    },
    fiscalYear: {
      label: fy.label,
      startBs: fy.startBs,
      endBs: fy.endBs,
      adStart: fy.startAd.toISOString().split('T')[0],
      adEnd: fy.endAd.toISOString().split('T')[0],
    },
    summary: {
      cashBalance,
      bankBalance,
      cashAndBank: cashBalance + bankBalance,
      accountsReceivable: arBalance,
      accountsPayable: Math.abs(apBalance),
      outputVat,
      inputVat,
      netVatPayable: Math.max(0, outputVat - inputVat),
      tdsPayable: Math.abs(tdsPayable),
      ssfPayable: Math.abs(ssfPayable),
      fyIncome,
      fyExpense,
      netProfit,
    },
    recentVouchers: recentVouchers.map(v => ({
      id: v.id,
      voucherNo: v.voucherNo,
      voucherType: v.voucherType,
      bsDate: v.bsDate,
      narration: v.narration,
      totalDebit: Number(v.totalDebit),
      totalCredit: Number(v.totalCredit),
      status: v.status,
    })),
    recentInvoices: recentInvoices.map(inv => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      bsDate: inv.bsDate,
      partyName: inv.party.name,
      partyPan: inv.party.pan,
      totalAmount: Number(inv.totalAmount),
      status: inv.status,
      invoiceType: inv.invoiceType,
    })),
  }
}
