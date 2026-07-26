// ============================================================
// API: Dashboard summary
// Returns cash position, receivables, payables, tax liability,
// recent vouchers, current FY info — all in NPR
// ============================================================

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getFiscalYear, adToBsString, formatBsDate, parseBsDate } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET() {
  const tenant = await db.tenant.findUnique({ where: { id: DEMO_TENANT_ID } })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const today = new Date()
  const fy = getFiscalYear(today)
  const todayBs = adToBsString(today)

  const fiscalYear = await db.fiscalYear.findFirst({
    where: { tenantId: tenant.id, bsYearStart: fy.bsYearStart },
  })

  const cashBankAccounts = await db.account.findMany({
    where: { tenantId: tenant.id, isCash: true },
  })
  const bankAccounts = await db.account.findMany({
    where: { tenantId: tenant.id, isBank: true },
  })

  async function sumAccountBalance(accountIds: string[]): Promise<number> {
    if (accountIds.length === 0) return 0
    const lines = await db.voucherLine.findMany({
      where: { accountId: { in: accountIds }, voucher: { tenantId: tenant.id, status: 'POSTED' } },
      select: { debit: true, credit: true },
    })
    let bal = 0
    for (const l of lines) bal += Number(l.debit) - Number(l.credit)
    const accounts = await db.account.findMany({ where: { id: { in: accountIds } }, select: { openingBalance: true } })
    for (const a of accounts) bal += Number(a.openingBalance)
    return bal
  }

  const cashBalance = await sumAccountBalance(cashBankAccounts.map(a => a.id))
  const bankBalance = await sumAccountBalance(bankAccounts.map(a => a.id))

  const arAccount = await db.account.findFirst({ where: { tenantId: tenant.id, code: '1010' } })
  const arBalance = arAccount ? await sumAccountBalance([arAccount.id]) : 0

  const apAccount = await db.account.findFirst({ where: { tenantId: tenant.id, code: '2001' } })
  const apBalance = apAccount ? await sumAccountBalance([apAccount.id]) : 0

  const outputVatAccount = await db.account.findFirst({ where: { tenantId: tenant.id, code: '2003' } })
  const outputVat = outputVatAccount ? await sumAccountBalance([outputVatAccount.id]) : 0

  const inputVatAccount = await db.account.findFirst({ where: { tenantId: tenant.id, code: '1040' } })
  const inputVat = inputVatAccount ? await sumAccountBalance([inputVatAccount.id]) : 0

  const tdsAccount = await db.account.findFirst({ where: { tenantId: tenant.id, code: '2004' } })
  const tdsPayable = tdsAccount ? await sumAccountBalance([tdsAccount.id]) : 0

  const ssfAccount = await db.account.findFirst({ where: { tenantId: tenant.id, code: '2005' } })
  const ssfPayable = ssfAccount ? await sumAccountBalance([ssfAccount.id]) : 0

  const recentVouchers = await db.voucher.findMany({
    where: { tenantId: tenant.id, status: 'POSTED' },
    orderBy: { adDate: 'desc' },
    take: 8,
    include: { lines: { include: { account: true } } },
  })

  const recentInvoices = await db.invoice.findMany({
    where: { tenantId: tenant.id },
    orderBy: { adDate: 'desc' },
    take: 5,
    include: { party: true },
  })

  const incomeAccounts = await db.account.findMany({
    where: { tenantId: tenant.id, type: 'INCOME', isGroup: false },
  })
  let fyIncome = 0
  for (const acc of incomeAccounts) {
    const bal = await sumAccountBalance([acc.id])
    fyIncome += Math.abs(bal)
  }

  const expenseAccounts = await db.account.findMany({
    where: { tenantId: tenant.id, type: 'EXPENSE', isGroup: false },
  })
  let fyExpense = 0
  for (const acc of expenseAccounts) {
    const bal = await sumAccountBalance([acc.id])
    fyExpense += Math.abs(bal)
  }

  const netProfit = fyIncome - fyExpense

  return NextResponse.json({
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
  })
}
