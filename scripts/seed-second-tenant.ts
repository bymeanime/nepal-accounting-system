// ============================================================
// Seed a second demo tenant to showcase multi-tenant capability
// ============================================================

import { db } from '../src/lib/db'
import { getFiscalYear } from '../src/lib/nepaliCalendar'
import { NEPAL_CHART_OF_ACCOUNTS } from '../src/lib/seedChartOfAccounts'
import { DEFAULT_VAT_RATES, DEFAULT_TDS_RATES, SSF_RATES, CORPORATE_TAX_RATES } from '../src/lib/taxEngine'

async function main() {
  console.log('🌱 Seeding second tenant for multi-tenant demo...')

  // Second tenant — a service company
  const tenant = await db.tenant.upsert({
    where: { id: 'demo-tenant-2' },
    update: {},
    create: {
      id: 'demo-tenant-2',
      name: 'Sagarmatha Digital Services',
      legalName: 'Sagarmatha Digital Services Pvt. Ltd.',
      pan: '609876543',
      vatNumber: '609876543',
      phone: '+977-1-4411998',
      email: 'info@sagarmathadigital.com.np',
      address: 'Lalitpur-12, Jhamsikhel',
      municipality: 'Lalitpur Metropolitan City',
      district: 'Lalitpur',
      province: 'Bagmati',
      baseCurrency: 'NPR',
      fyStartBsMonth: 4,
      language: 'en',
    },
  })
  console.log(`✅ Second tenant: ${tenant.name} (PAN: ${tenant.pan})`)

  // Fiscal year
  const fy = getFiscalYear(new Date())
  await db.fiscalYear.upsert({
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

  // Chart of accounts
  const codeToId: Record<string, string> = {}
  for (const acc of NEPAL_CHART_OF_ACCOUNTS) {
    if (!acc.parentId) {
      const created = await db.account.create({
        data: {
          tenantId: tenant.id, code: acc.code, name: acc.name, nameNp: acc.nameNp,
          type: acc.type, subType: acc.subType, isGroup: acc.isGroup,
          isCash: acc.isCash ?? false, isBank: acc.isBank ?? false,
          sortOrder: acc.sortOrder ?? 0,
        },
      })
      codeToId[acc.code] = created.id
    }
  }
  for (const acc of NEPAL_CHART_OF_ACCOUNTS) {
    if (acc.parentId && codeToId[acc.parentId]) {
      const created = await db.account.create({
        data: {
          tenantId: tenant.id, code: acc.code, name: acc.name, nameNp: acc.nameNp,
          type: acc.type, subType: acc.subType, isGroup: acc.isGroup,
          isCash: acc.isCash ?? false, isBank: acc.isBank ?? false,
          parentId: codeToId[acc.parentId], sortOrder: acc.sortOrder ?? 0,
        },
      })
      codeToId[acc.code] = created.id
    }
  }
  console.log(`✅ Chart of Accounts: ${NEPAL_CHART_OF_ACCOUNTS.length} accounts seeded for second tenant`)

  // Tax rules
  await db.taxRule.create({
    data: { tenantId: tenant.id, taxType: 'VAT', section: 'STANDARD', name: 'VAT Standard Rate', rate: DEFAULT_VAT_RATES.STANDARD, effectiveFromBs: '2072-01-01' },
  })
  await db.taxRule.create({
    data: { tenantId: tenant.id, taxType: 'SSF', section: 'EMPLOYEE', name: 'SSF Employee', rate: SSF_RATES.EMPLOYEE_PCT_OF_BASIC, effectiveFromBs: '2076-01-01' },
  })
  await db.taxRule.create({
    data: { tenantId: tenant.id, taxType: 'SSF', section: 'EMPLOYER', name: 'SSF Employer', rate: SSF_RATES.EMPLOYER_PCT_OF_BASIC, effectiveFromBs: '2076-01-01' },
  })

  // Add a few parties for second tenant
  await db.party.create({
    data: {
      tenantId: tenant.id,
      name: 'Kathmandu University',
      type: 'CUSTOMER',
      pan: '601112233',
      phone: '+977-11-663900',
      address: 'Dhulikhel, Kavre',
      openingBalance: 0,
    },
  })
  await db.party.create({
    data: {
      tenantId: tenant.id,
      name: 'Nepal Telecom',
      type: 'CUSTOMER',
      pan: '601224466',
      phone: '+977-1-4211111',
      address: 'Bhadrakali Plaza, Kathmandu',
      openingBalance: 0,
    },
  })

  console.log('✅ Second tenant ready with chart of accounts, tax rules, and 2 demo parties')
  console.log('\n🎉 Multi-tenant demo ready!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
