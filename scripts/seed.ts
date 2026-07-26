// ============================================================
// Database seeding script
// Creates demo tenant, admin user, default chart of accounts,
// default tax rules, and a current fiscal year.
// Run: bun run /home/z/my-project/scripts/seed.ts
// ============================================================

import { db } from '../src/lib/db'
import { NEPAL_CHART_OF_ACCOUNTS } from '../src/lib/seedChartOfAccounts'
import { getFiscalYear, adToBsString } from '../src/lib/nepaliCalendar'
import { DEFAULT_VAT_RATES, DEFAULT_TDS_RATES, SSF_RATES, CORPORATE_TAX_RATES } from '../src/lib/taxEngine'

async function main() {
  console.log('🌱 Seeding Nepal Accounting System database...')

  // 1. Create demo tenant
  const tenant = await db.tenant.upsert({
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
  console.log(`✅ Tenant: ${tenant.name} (PAN: ${tenant.pan})`)

  // 2. Create admin user
  const user = await db.user.upsert({
    where: { email: 'admin@himaltrading.com.np' },
    update: {},
    create: {
      email: 'admin@himaltrading.com.np',
      name: 'Sita Sharma',
      passwordHash: '$2a$10$placeholderhashfornow1234567890123456',
      preferredLanguage: 'en',
    },
  })

  await db.userTenant.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    update: { role: 'OWNER' },
    create: { userId: user.id, tenantId: tenant.id, role: 'OWNER' },
  })
  console.log(`✅ User: ${user.email} (OWNER)`)

  // 3. Create current fiscal year
  const fy = getFiscalYear(new Date())
  const fiscalYear = await db.fiscalYear.upsert({
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
  console.log(`✅ Fiscal Year: ${fy.label} (${fy.startBs} → ${fy.endBs})`)

  // 4. Seed chart of accounts (top-level groups first, then children)
  // Clear existing
  await db.account.deleteMany({ where: { tenantId: tenant.id } })

  const codeToId: Record<string, string> = {}
  // First pass: groups (no parent)
  for (const acc of NEPAL_CHART_OF_ACCOUNTS) {
    if (!acc.parentId) {
      const created = await db.account.create({
        data: {
          tenantId: tenant.id,
          code: acc.code,
          name: acc.name,
          nameNp: acc.nameNp,
          type: acc.type,
          subType: acc.subType,
          isGroup: acc.isGroup,
          isCash: acc.isCash ?? false,
          isBank: acc.isBank ?? false,
          sortOrder: acc.sortOrder ?? 0,
        },
      })
      codeToId[acc.code] = created.id
    }
  }
  // Second pass: child accounts (resolve parentId)
  for (const acc of NEPAL_CHART_OF_ACCOUNTS) {
    if (acc.parentId && codeToId[acc.parentId]) {
      const created = await db.account.create({
        data: {
          tenantId: tenant.id,
          code: acc.code,
          name: acc.name,
          nameNp: acc.nameNp,
          type: acc.type,
          subType: acc.subType,
          isGroup: acc.isGroup,
          isCash: acc.isCash ?? false,
          isBank: acc.isBank ?? false,
          parentId: codeToId[acc.parentId],
          sortOrder: acc.sortOrder ?? 0,
        },
      })
      codeToId[acc.code] = created.id
    }
  }
  console.log(`✅ Chart of Accounts: ${NEPAL_CHART_OF_ACCOUNTS.length} accounts seeded`)

  // 5. Seed default tax rules
  await db.taxRule.deleteMany({ where: { tenantId: tenant.id } })

  await db.taxRule.create({
    data: {
      tenantId: tenant.id,
      taxType: 'VAT',
      section: 'STANDARD',
      name: 'VAT Standard Rate',
      rate: DEFAULT_VAT_RATES.STANDARD,
      effectiveFromBs: '2072-01-01',
    },
  })
  await db.taxRule.create({
    data: {
      tenantId: tenant.id,
      taxType: 'VAT',
      section: 'RIDE_SHARE',
      name: 'VAT Ride-Sharing (FY 2083/84)',
      rate: DEFAULT_VAT_RATES.RIDE_SHARE,
      effectiveFromBs: '2083-01-01',
    },
  })
  await db.taxRule.create({
    data: {
      tenantId: tenant.id,
      taxType: 'VAT',
      section: 'ZERO_RATED',
      name: 'VAT Zero-Rated (Exports)',
      rate: DEFAULT_VAT_RATES.ZERO_RATED,
      effectiveFromBs: '2072-01-01',
    },
  })

  for (const [code, def] of Object.entries(DEFAULT_TDS_RATES)) {
    await db.taxRule.create({
      data: {
        tenantId: tenant.id,
        taxType: 'TDS',
        section: code,
        name: def.label,
        rate: def.rate,
        thresholdMin: def.threshold,
        effectiveFromBs: '2081-01-01',
        appliesTo: code.includes('_NR') ? 'NON_RESIDENT' : 'RESIDENT',
      },
    })
  }

  await db.taxRule.create({
    data: {
      tenantId: tenant.id,
      taxType: 'SSF',
      section: 'EMPLOYEE',
      name: 'SSF Employee Contribution',
      rate: SSF_RATES.EMPLOYEE_PCT_OF_BASIC,
      effectiveFromBs: '2076-01-01',
    },
  })
  await db.taxRule.create({
    data: {
      tenantId: tenant.id,
      taxType: 'SSF',
      section: 'EMPLOYER',
      name: 'SSF Employer Contribution',
      rate: SSF_RATES.EMPLOYER_PCT_OF_BASIC,
      effectiveFromBs: '2076-01-01',
    },
  })

  await db.taxRule.create({
    data: {
      tenantId: tenant.id,
      taxType: 'INCOME_TAX',
      section: 'CORP_NORMAL',
      name: 'Corporate Income Tax (Normal)',
      rate: CORPORATE_TAX_RATES.NORMAL_BUSINESS,
      effectiveFromBs: '2081-01-01',
    },
  })
  console.log(`✅ Tax Rules seeded (VAT + ${Object.keys(DEFAULT_TDS_RATES).length} TDS sections + SSF + Income Tax)`)

  // 6. Demo parties
  await db.party.deleteMany({ where: { tenantId: tenant.id } })
  const parties = [
    { name: 'Annapurna Department Store', pan: '602345678', type: 'CUSTOMER', phone: '+977-1-4223344', address: 'Pokhara-8, Lakeside' },
    { name: 'Sagarmatha Suppliers', pan: '603456789', type: 'SUPPLIER', phone: '+977-1-5566778', address: 'Biratnagar-3', tdsSection: '88_CONTRACT' },
    { name: 'Kathmandu Cafe Pvt. Ltd.', pan: '604567890', type: 'CUSTOMER', phone: '+977-1-4411223', address: 'Lalitpur-12, Jhamsikhel' },
    { name: 'Everest Construction', pan: '605678901', type: 'SUPPLIER', phone: '+977-1-4455667', address: 'Bhaktapur-7', tdsSection: '88_CONTRACT' },
    { name: 'Cash Customer', type: 'CUSTOMER', phone: '', address: 'Walk-in' },
  ]
  for (const p of parties) {
    await db.party.create({
      data: {
        tenantId: tenant.id,
        name: p.name,
        type: p.type as 'CUSTOMER' | 'SUPPLIER',
        pan: p.pan,
        phone: p.phone,
        address: p.address,
        tdsSection: p.tdsSection,
        openingBalance: 0,
      },
    })
  }
  console.log(`✅ Demo parties: ${parties.length} created`)

  // 7. Demo employee
  await db.employee.deleteMany({ where: { tenantId: tenant.id } })
  await db.employee.create({
    data: {
      tenantId: tenant.id,
      name: 'Ram Bahadur',
      nameNp: 'राम बहादुर',
      pan: '606789012',
      ssfNumber: 'SSF-789012',
      department: 'Sales',
      designation: 'Sales Officer',
      joiningBsDate: '2079-04-01',
      basicSalary: 35000,
      allowance: 8000,
      residency: 'RESIDENT',
      status: 'ACTIVE',
      phone: '+977-98XXXXXXX',
    },
  })
  console.log('✅ Demo employee created')

  console.log('\n🎉 Seeding complete!')
  console.log(`   Login email: ${user.email}`)
  console.log(`   Tenant: ${tenant.name}`)
  console.log(`   Fiscal Year: ${fy.label}`)
  console.log(`   Today (BS): ${adToBsString(new Date())}`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
