// ============================================================
// Runtime seeders — used by /api/admin/init to seed the DB
// on Vercel deployments where we can't run scripts/seed.ts
// ============================================================

import { PrismaClient } from '@prisma/client'
import '@/lib/db-server' // ensure SQLite file exists
import { NEPAL_CHART_OF_ACCOUNTS } from '@/lib/seedChartOfAccounts'
import { getFiscalYear, adToBsString, bsStringToAd } from '@/lib/nepaliCalendar'
import {
  DEFAULT_VAT_RATES, DEFAULT_TDS_RATES, SSF_RATES, CORPORATE_TAX_RATES,
} from '@/lib/taxEngine'

const prisma = new PrismaClient()

export interface SeedResult {
  tenantsCreated: number
  accountsCreated: number
  vouchersCreated: number
  demoTenantName: string
  demoEmail: string
}

export async function runSeeders(): Promise<SeedResult> {
  let tenantsCreated = 0
  let accountsCreated = 0
  let vouchersCreated = 0

  // 1. Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant' },
    update: {},
    create: {
      id: 'demo-tenant',
      name: 'Himal Trading Pvt. Ltd.',
      legalName: 'Himal Trading Private Limited',
      pan: '601234567',
      vatNumber: '601234567',
      phone: '+977-1-4445566',
      email: 'info@himaltrading.com.np',
      address: 'Kathmandu-11, New Road',
      municipality: 'Kathmandu Metropolitan City',
      district: 'Kathmandu',
      province: 'Bagmati',
      baseCurrency: 'NPR',
      fyStartBsMonth: 4,
      language: 'en',
    },
  })
  tenantsCreated++

  // 2. Admin user
  const user = await prisma.user.upsert({
    where: { email: 'admin@himaltrading.com.np' },
    update: {},
    create: {
      email: 'admin@himaltrading.com.np',
      name: 'Sita Sharma',
      passwordHash: '$2a$10$placeholderhashfornow1234567890123456',
      preferredLanguage: 'en',
    },
  })
  await prisma.userTenant.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    update: { role: 'OWNER' },
    create: { userId: user.id, tenantId: tenant.id, role: 'OWNER' },
  })

  // 3. Fiscal year
  const fy = getFiscalYear(new Date())
  await prisma.fiscalYear.upsert({
    where: { tenantId_bsYearStart: { tenantId: tenant.id, bsYearStart: fy.bsYearStart } },
    update: {},
    create: {
      tenantId: tenant.id,
      bsYearStart: fy.bsYearStart,
      bsYearEnd: fy.bsYearEnd,
      adStart: fy.startAd,
      adEnd: fy.endAd,
      status: 'OPEN',
    },
  })

  // 4. Chart of accounts
  await prisma.account.deleteMany({ where: { tenantId: tenant.id } })
  const codeToId: Record<string, string> = {}
  for (const acc of NEPAL_CHART_OF_ACCOUNTS) {
    if (!acc.parentId) {
      const created = await prisma.account.create({
        data: {
          tenantId: tenant.id, code: acc.code, name: acc.name, nameNp: acc.nameNp,
          type: acc.type, subType: acc.subType, isGroup: acc.isGroup,
          isCash: acc.isCash ?? false, isBank: acc.isBank ?? false,
          sortOrder: acc.sortOrder ?? 0,
        },
      })
      codeToId[acc.code] = created.id
      accountsCreated++
    }
  }
  for (const acc of NEPAL_CHART_OF_ACCOUNTS) {
    if (acc.parentId && codeToId[acc.parentId]) {
      const created = await prisma.account.create({
        data: {
          tenantId: tenant.id, code: acc.code, name: acc.name, nameNp: acc.nameNp,
          type: acc.type, subType: acc.subType, isGroup: acc.isGroup,
          isCash: acc.isCash ?? false, isBank: acc.isBank ?? false,
          parentId: codeToId[acc.parentId], sortOrder: acc.sortOrder ?? 0,
        },
      })
      codeToId[acc.code] = created.id
      accountsCreated++
    }
  }

  // 5. Tax rules
  await prisma.taxRule.deleteMany({ where: { tenantId: tenant.id } })
  await prisma.taxRule.create({ data: { tenantId: tenant.id, taxType: 'VAT', section: 'STANDARD', name: 'VAT Standard', rate: DEFAULT_VAT_RATES.STANDARD, effectiveFromBs: '2072-01-01' } })
  await prisma.taxRule.create({ data: { tenantId: tenant.id, taxType: 'VAT', section: 'RIDE_SHARE', name: 'VAT Ride-Sharing', rate: DEFAULT_VAT_RATES.RIDE_SHARE, effectiveFromBs: '2083-01-01' } })
  for (const [code, def] of Object.entries(DEFAULT_TDS_RATES)) {
    await prisma.taxRule.create({
      data: {
        tenantId: tenant.id, taxType: 'TDS', section: code, name: def.label,
        rate: def.rate, thresholdMin: def.threshold, effectiveFromBs: '2081-01-01',
        appliesTo: code.includes('_NR') ? 'NON_RESIDENT' : 'RESIDENT',
      },
    })
  }
  await prisma.taxRule.create({ data: { tenantId: tenant.id, taxType: 'SSF', section: 'EMPLOYEE', name: 'SSF Employee', rate: SSF_RATES.EMPLOYEE_PCT_OF_BASIC, effectiveFromBs: '2076-01-01' } })
  await prisma.taxRule.create({ data: { tenantId: tenant.id, taxType: 'SSF', section: 'EMPLOYER', name: 'SSF Employer', rate: SSF_RATES.EMPLOYER_PCT_OF_BASIC, effectiveFromBs: '2076-01-01' } })
  await prisma.taxRule.create({ data: { tenantId: tenant.id, taxType: 'INCOME_TAX', section: 'CORP_NORMAL', name: 'Corp Income Tax', rate: CORPORATE_TAX_RATES.NORMAL_BUSINESS, effectiveFromBs: '2081-01-01' } })

  // 6. Demo parties
  await prisma.party.deleteMany({ where: { tenantId: tenant.id } })
  const parties = [
    { name: 'Annapurna Department Store', pan: '602345678', type: 'CUSTOMER', phone: '+977-1-4223344', address: 'Pokhara-8, Lakeside' },
    { name: 'Sagarmatha Suppliers', pan: '603456789', type: 'SUPPLIER', phone: '+977-1-5566778', address: 'Biratnagar-3', tdsSection: '88_CONTRACT' },
    { name: 'Kathmandu Cafe Pvt. Ltd.', pan: '604567890', type: 'CUSTOMER', phone: '+977-1-4411223', address: 'Lalitpur-12, Jhamsikhel' },
    { name: 'Everest Construction', pan: '605678901', type: 'SUPPLIER', phone: '+977-1-4455667', address: 'Bhaktapur-7', tdsSection: '88_CONTRACT' },
    { name: 'Cash Customer', type: 'CUSTOMER', phone: '', address: 'Walk-in' },
  ]
  for (const p of parties) {
    await prisma.party.create({
      data: {
        tenantId: tenant.id, name: p.name, type: p.type as 'CUSTOMER' | 'SUPPLIER',
        pan: p.pan, phone: p.phone, address: p.address, tdsSection: p.tdsSection,
        openingBalance: 0,
      },
    })
  }

  // 7. Demo employee
  await prisma.employee.deleteMany({ where: { tenantId: tenant.id } })
  await prisma.employee.create({
    data: {
      tenantId: tenant.id, name: 'Ram Bahadur', nameNp: 'राम बहादुर',
      pan: '606789012', ssfNumber: 'SSF-789012', department: 'Sales',
      designation: 'Sales Officer', joiningBsDate: '2079-04-01',
      basicSalary: 35000, allowance: 8000, residency: 'RESIDENT', status: 'ACTIVE',
    },
  })

  // 8. Demo transactions — minimal set to populate dashboard
  const accByCode = async (code: string) => (await prisma.account.findFirst({ where: { tenantId: tenant.id, code } }))!
  const bank = await accByCode('1002')
  const capital = await accByCode('3001')
  const ar = await accByCode('1010')
  const salesTaxable = await accByCode('4001')
  const salesExempt = await accByCode('4003')
  const outputVat = await accByCode('2003')
  const inputVat = await accByCode('1040')
  const purchases = await accByCode('5002')
  const rentExpense = await accByCode('5104')
  const salaryExpense = await accByCode('5101')
  const tdsPayable = await accByCode('2004')
  const ap = await accByCode('2001')

  const cust1 = (await prisma.party.findFirst({ where: { tenantId: tenant.id, name: 'Annapurna Department Store' } })!)!
  const cust2 = (await prisma.party.findFirst({ where: { tenantId: tenant.id, name: 'Kathmandu Cafe Pvt. Ltd.' } })!)!
  const supplier1 = (await prisma.party.findFirst({ where: { tenantId: tenant.id, name: 'Sagarmatha Suppliers' } })!)!

  async function postVoucher(bsDate: string, adDate: Date, narration: string, voucherType: string, lines: Array<{ account: any; debit: number; credit: number; description?: string }>) {
    const datePart = bsDate.replace(/-/g, '')
    const count = await prisma.voucher.count({ where: { tenantId: tenant.id, voucherNo: { startsWith: `JV-${datePart}` } } })
    const voucherNo = `JV-${datePart}-${String(count + 1).padStart(3, '0')}`
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0)
    await prisma.voucher.create({
      data: {
        tenantId: tenant.id, voucherNo, voucherType, bsDate, adDate, narration,
        totalDebit, totalCredit, status: 'POSTED',
        lines: { create: lines.map(l => ({ accountId: l.account.id, debit: l.debit, credit: l.credit, description: l.description })) },
      },
    })
    vouchersCreated++
  }

  // Capital
  await postVoucher('2082-04-05', new Date(2025, 6, 20), 'Capital introduced by owner', 'RECEIPT', [
    { account: bank, debit: 500000, credit: 0 }, { account: capital, debit: 0, credit: 500000 },
  ])

  // Sale 1
  await prisma.invoice.create({
    data: {
      tenantId: tenant.id, invoiceNo: 'INV-20820510-001', invoiceType: 'TAX_INVOICE',
      bsDate: '2082-05-10', adDate: new Date(2025, 7, 26), partyId: cust1.id, panBuyer: cust1.pan,
      subtotal: 50000, taxableAmount: 50000, vatAmount: 6500, totalAmount: 56500,
      currency: 'NPR', exchangeRate: 1, status: 'UNPAID',
      qrData: JSON.stringify({ invoice_no: 'INV-20820510-001', date: '2082-05-10', total: 56500, vat: 6500 }),
      lines: { create: [{ description: 'Trading goods - Lot A', quantity: 10, unit: 'PCS', rate: 5000, taxableAmount: 50000, vatRate: 13, vatAmount: 6500, totalAmount: 56500 }] },
    },
  })
  await postVoucher('2082-05-10', new Date(2025, 7, 26), 'Sales INV-20820510-001', 'SALES', [
    { account: ar, debit: 56500, credit: 0 }, { account: salesTaxable, debit: 0, credit: 50000 }, { account: outputVat, debit: 0, credit: 6500 },
  ])

  // Sale 2 (exempt)
  await prisma.invoice.create({
    data: {
      tenantId: tenant.id, invoiceNo: 'INV-20820605-001', invoiceType: 'EXEMPT',
      bsDate: '2082-06-05', adDate: new Date(2025, 8, 21), partyId: cust2.id, panBuyer: cust2.pan,
      subtotal: 25000, exemptAmount: 25000, totalAmount: 25000,
      currency: 'NPR', exchangeRate: 1, status: 'UNPAID',
      qrData: JSON.stringify({ invoice_no: 'INV-20820605-001', date: '2082-06-05', total: 25000, vat: 0 }),
      lines: { create: [{ description: 'Catering (exempt)', quantity: 1, unit: 'JOB', rate: 25000, taxableAmount: 0, vatRate: 0, vatAmount: 0, totalAmount: 25000 }] },
    },
  })
  await postVoucher('2082-06-05', new Date(2025, 8, 21), 'Sales INV-20820605-001 exempt', 'SALES', [
    { account: ar, debit: 25000, credit: 0 }, { account: salesExempt, debit: 0, credit: 25000 },
  ])

  // Sale 3
  await prisma.invoice.create({
    data: {
      tenantId: tenant.id, invoiceNo: 'INV-20820715-001', invoiceType: 'TAX_INVOICE',
      bsDate: '2082-07-15', adDate: new Date(2025, 9, 31), partyId: cust1.id, panBuyer: cust1.pan,
      subtotal: 80000, taxableAmount: 80000, vatAmount: 10400, totalAmount: 90400,
      currency: 'NPR', exchangeRate: 1, status: 'UNPAID',
      qrData: JSON.stringify({ invoice_no: 'INV-20820715-001', date: '2082-07-15', total: 90400, vat: 10400 }),
      lines: { create: [{ description: 'Trading goods - Lot B', quantity: 8, unit: 'PCS', rate: 10000, taxableAmount: 80000, vatRate: 13, vatAmount: 10400, totalAmount: 90400 }] },
    },
  })
  await postVoucher('2082-07-15', new Date(2025, 9, 31), 'Sales INV-20820715-001', 'SALES', [
    { account: ar, debit: 90400, credit: 0 }, { account: salesTaxable, debit: 0, credit: 80000 }, { account: outputVat, debit: 0, credit: 10400 },
  ])

  // Purchase bill with TDS
  await prisma.purchaseBill.create({
    data: {
      tenantId: tenant.id, billNo: 'PB-20820912-001', vendorBillNo: 'SS-2025-001',
      bsDate: '2082-09-12', adDate: new Date(2025, 11, 27), partyId: supplier1.id, vendorPan: supplier1.pan,
      subtotal: 60000, taxableAmount: 60000, vatAmount: 7800, totalAmount: 67800,
      tdsSection: '88_CONTRACT', tdsRate: 1.5, tdsAmount: 900, netPayable: 66900,
      status: 'UNPAID',
      lines: { create: [{ description: 'Goods purchase', quantity: 6, unit: 'PCS', rate: 10000, taxableAmount: 60000, vatRate: 13, vatAmount: 7800, totalAmount: 67800 }] },
    },
  })
  await postVoucher('2082-09-12', new Date(2025, 11, 27), 'Purchase PB-20820912-001', 'PURCHASE', [
    { account: purchases, debit: 60000, credit: 0 }, { account: inputVat, debit: 7800, credit: 0 },
    { account: tdsPayable, debit: 0, credit: 900 }, { account: ap, debit: 0, credit: 66900 },
  ])

  // Rent payment with TDS
  await postVoucher('2082-10-05', new Date(2026, 0, 18), 'Office rent — TDS 10% on rent', 'PAYMENT', [
    { account: rentExpense, debit: 30000, credit: 0 }, { account: tdsPayable, debit: 0, credit: 3000 },
    { account: bank, debit: 0, credit: 27000 },
  ])

  // Salary payment
  await postVoucher('2082-11-28', new Date(2026, 2, 11), 'Salary payment Falgun 2082', 'PAYMENT', [
    { account: salaryExpense, debit: 43000, credit: 0 }, { account: bank, debit: 0, credit: 43000 },
  ])

  // Customer receipt
  await postVoucher('2082-12-10', new Date(2026, 2, 22), 'Receipt from Annapurna', 'RECEIPT', [
    { account: bank, debit: 56500, credit: 0 }, { account: ar, debit: 0, credit: 56500 },
  ])

  // Current month sale
  await prisma.invoice.create({
    data: {
      tenantId: tenant.id, invoiceNo: 'INV-20830315-001', invoiceType: 'TAX_INVOICE',
      bsDate: '2083-03-15', adDate: new Date(2026, 6, 14), partyId: cust1.id, panBuyer: cust1.pan,
      subtotal: 42000, taxableAmount: 42000, vatAmount: 5460, totalAmount: 47460,
      currency: 'NPR', exchangeRate: 1, status: 'UNPAID',
      qrData: JSON.stringify({ invoice_no: 'INV-20830315-001', date: '2083-03-15', total: 47460, vat: 5460 }),
      lines: { create: [{ description: 'Trading goods - Lot C', quantity: 4, unit: 'PCS', rate: 10500, taxableAmount: 42000, vatRate: 13, vatAmount: 5460, totalAmount: 47460 }] },
    },
  })
  await postVoucher('2083-03-15', new Date(2026, 6, 14), 'Sales INV-20830315-001 current month', 'SALES', [
    { account: ar, debit: 47460, credit: 0 }, { account: salesTaxable, debit: 0, credit: 42000 }, { account: outputVat, debit: 0, credit: 5460 },
  ])

  return {
    tenantsCreated,
    accountsCreated,
    vouchersCreated,
    demoTenantName: tenant.name,
    demoEmail: user.email,
  }
}
