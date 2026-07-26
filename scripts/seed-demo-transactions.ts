// ============================================================
// Demo transactions seeder
// Creates a few invoices, purchase bills, and vouchers so the
// dashboard/reports have data to display.
// ============================================================

import { db } from '../src/lib/db'

const DEMO_TENANT_ID = 'demo-tenant'

async function main() {
  console.log('🌱 Adding demo transactions...')

  const parties = await db.party.findMany({ where: { tenantId: DEMO_TENANT_ID } })
  const customer1 = parties.find(p => p.name === 'Annapurna Department Store')!
  const customer2 = parties.find(p => p.name === 'Kathmandu Cafe Pvt. Ltd.')!
  const supplier1 = parties.find(p => p.name === 'Sagarmatha Suppliers')!
  const supplier2 = parties.find(p => p.name === 'Everest Construction')!

  // Get accounts
  const accByCode = async (code: string) => {
    const acc = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code } })
    if (!acc) throw new Error(`Account ${code} not found`)
    return acc
  }

  const cash = await accByCode('1001')
  const bank = await accByCode('1002')
  const ar = await accByCode('1010')
  const ap = await accByCode('2001')
  const salesTaxable = await accByCode('4001')
  const salesExempt = await accByCode('4003')
  const outputVat = await accByCode('2003')
  const inputVat = await accByCode('1040')
  const purchases = await accByCode('5002')
  const rentExpense = await accByCode('5104')
  const salaryExpense = await accByCode('5101')
  const tdsPayable = await accByCode('2004')
  const capital = await accByCode('3001')

  // Helper to post voucher
  async function postVoucher(bsDate: string, adDate: Date, narration: string, voucherType: string, lines: Array<{ account: any; debit: number; credit: number; description?: string }>) {
    const datePart = bsDate.replace(/-/g, '')
    const count = await db.voucher.count({
      where: { tenantId: DEMO_TENANT_ID, voucherNo: { startsWith: `JV-${datePart}` } },
    })
    const voucherNo = `JV-${datePart}-${String(count + 1).padStart(3, '0')}`
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0)

    return db.voucher.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        voucherNo,
        voucherType,
        bsDate,
        adDate,
        narration,
        totalDebit,
        totalCredit,
        status: 'POSTED',
        lines: {
          create: lines.map(l => ({
            accountId: l.account.id,
            debit: l.debit,
            credit: l.credit,
            description: l.description,
          })),
        },
      },
    })
  }

  // 1. Capital introduction (Shrawan 5, 2082)
  await postVoucher(
    '2082-04-05', new Date(2025, 6, 20),
    'Capital introduced by owner via bank deposit',
    'RECEIPT',
    [
      { account: bank, debit: 500000, credit: 0, description: 'Bank deposit' },
      { account: capital, debit: 0, credit: 500000, description: 'Owner capital' },
    ]
  )

  // 2. Sales invoice 1 — to Annapurna (Bhadra 10, 2082)
  await db.invoice.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      invoiceNo: 'INV-20820510-001',
      invoiceType: 'TAX_INVOICE',
      bsDate: '2082-05-10',
      adDate: new Date(2025, 7, 26),
      partyId: customer1.id,
      panBuyer: customer1.pan,
      subtotal: 50000,
      discountAmount: 0,
      taxableAmount: 50000,
      vatAmount: 6500,
      zeroRatedAmount: 0,
      exemptAmount: 0,
      totalAmount: 56500,
      currency: 'NPR',
      exchangeRate: 1,
      status: 'UNPAID',
      qrData: JSON.stringify({ invoice_no: 'INV-20820510-001', date: '2082-05-10', seller_pan: '601234567', buyer_pan: '602345678', total: 56500, vat: 6500 }),
      lines: {
        create: [
          { description: 'Trading goods - Lot A', quantity: 10, unit: 'PCS', rate: 5000, taxableAmount: 50000, vatRate: 13, vatAmount: 6500, totalAmount: 56500 },
        ],
      },
    },
  })
  await postVoucher(
    '2082-05-10', new Date(2025, 7, 26),
    'Sales invoice INV-20820510-001 — Annapurna',
    'SALES',
    [
      { account: ar, debit: 56500, credit: 0, description: 'Receivable' },
      { account: salesTaxable, debit: 0, credit: 50000, description: 'Taxable sales' },
      { account: outputVat, debit: 0, credit: 6500, description: 'Output VAT 13%' },
    ]
  )

  // 3. Sales invoice 2 — to Kathmandu Cafe (Ashwin 5, 2082) — exempt
  await db.invoice.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      invoiceNo: 'INV-20820605-001',
      invoiceType: 'EXEMPT',
      bsDate: '2082-06-05',
      adDate: new Date(2025, 8, 21),
      partyId: customer2.id,
      panBuyer: customer2.pan,
      subtotal: 25000,
      discountAmount: 0,
      taxableAmount: 0,
      vatAmount: 0,
      zeroRatedAmount: 0,
      exemptAmount: 25000,
      totalAmount: 25000,
      currency: 'NPR',
      exchangeRate: 1,
      status: 'UNPAID',
      qrData: JSON.stringify({ invoice_no: 'INV-20820605-001', date: '2082-06-05', total: 25000, vat: 0 }),
      lines: {
        create: [
          { description: 'Catering services (exempt)', quantity: 1, unit: 'JOB', rate: 25000, taxableAmount: 0, vatRate: 0, vatAmount: 0, totalAmount: 25000 },
        ],
      },
    },
  })
  await postVoucher(
    '2082-06-05', new Date(2025, 8, 21),
    'Sales invoice INV-20820605-001 — Kathmandu Cafe (exempt)',
    'SALES',
    [
      { account: ar, debit: 25000, credit: 0, description: 'Receivable' },
      { account: salesExempt, debit: 0, credit: 25000, description: 'Exempt sales' },
    ]
  )

  // 4. Sales invoice 3 — Kartik 15, 2082
  await db.invoice.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      invoiceNo: 'INV-20820715-001',
      invoiceType: 'TAX_INVOICE',
      bsDate: '2082-07-15',
      adDate: new Date(2025, 9, 31),
      partyId: customer1.id,
      panBuyer: customer1.pan,
      subtotal: 80000,
      discountAmount: 0,
      taxableAmount: 80000,
      vatAmount: 10400,
      zeroRatedAmount: 0,
      exemptAmount: 0,
      totalAmount: 90400,
      currency: 'NPR',
      exchangeRate: 1,
      status: 'UNPAID',
      qrData: JSON.stringify({ invoice_no: 'INV-20820715-001', date: '2082-07-15', seller_pan: '601234567', buyer_pan: '602345678', total: 90400, vat: 10400 }),
      lines: {
        create: [
          { description: 'Trading goods - Lot B', quantity: 8, unit: 'PCS', rate: 10000, taxableAmount: 80000, vatRate: 13, vatAmount: 10400, totalAmount: 90400 },
        ],
      },
    },
  })
  await postVoucher(
    '2082-07-15', new Date(2025, 9, 31),
    'Sales invoice INV-20820715-001 — Annapurna',
    'SALES',
    [
      { account: ar, debit: 90400, credit: 0, description: 'Receivable' },
      { account: salesTaxable, debit: 0, credit: 80000, description: 'Taxable sales' },
      { account: outputVat, debit: 0, credit: 10400, description: 'Output VAT 13%' },
    ]
  )

  // 5. Sales invoice 4 — Mangsir 8, 2082
  await db.invoice.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      invoiceNo: 'INV-20820808-001',
      invoiceType: 'TAX_INVOICE',
      bsDate: '2082-08-08',
      adDate: new Date(2025, 10, 23),
      partyId: customer2.id,
      panBuyer: customer2.pan,
      subtotal: 35000,
      discountAmount: 0,
      taxableAmount: 35000,
      vatAmount: 4550,
      zeroRatedAmount: 0,
      exemptAmount: 0,
      totalAmount: 39550,
      currency: 'NPR',
      exchangeRate: 1,
      status: 'PAID',
      qrData: JSON.stringify({ invoice_no: 'INV-20820808-001', date: '2082-08-08', seller_pan: '601234567', buyer_pan: '604567890', total: 39550, vat: 4550 }),
      lines: {
        create: [
          { description: 'Office supplies', quantity: 1, unit: 'LOT', rate: 35000, taxableAmount: 35000, vatRate: 13, vatAmount: 4550, totalAmount: 39550 },
        ],
      },
    },
  })
  await postVoucher(
    '2082-08-08', new Date(2025, 10, 23),
    'Sales invoice INV-20820808-001 — Kathmandu Cafe',
    'SALES',
    [
      { account: ar, debit: 39550, credit: 0, description: 'Receivable' },
      { account: salesTaxable, debit: 0, credit: 35000, description: 'Taxable sales' },
      { account: outputVat, debit: 0, credit: 4550, description: 'Output VAT 13%' },
    ]
  )

  // 6. Purchase bill from Sagarmatha — Poush 12, 2082 (with TDS 1.5% on contract)
  await db.purchaseBill.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      billNo: 'PB-20820912-001',
      vendorBillNo: 'SS-2025-001',
      bsDate: '2082-09-12',
      adDate: new Date(2025, 11, 27),
      partyId: supplier1.id,
      vendorPan: supplier1.pan,
      subtotal: 60000,
      discountAmount: 0,
      taxableAmount: 60000,
      vatAmount: 7800,
      exemptAmount: 0,
      totalAmount: 67800,
      tdsSection: '88_CONTRACT',
      tdsRate: 1.5,
      tdsAmount: 900,
      netPayable: 66900,
      status: 'UNPAID',
      lines: {
        create: [
          { description: 'Goods purchase - bulk', quantity: 6, unit: 'PCS', rate: 10000, taxableAmount: 60000, vatRate: 13, vatAmount: 7800, totalAmount: 67800 },
        ],
      },
    },
  })
  await postVoucher(
    '2082-09-12', new Date(2025, 11, 27),
    'Purchase bill PB-20820912-001 — Sagarmatha Suppliers',
    'PURCHASE',
    [
      { account: purchases, debit: 60000, credit: 0, description: 'Purchase' },
      { account: inputVat, debit: 7800, credit: 0, description: 'Input VAT 13%' },
      { account: tdsPayable, debit: 0, credit: 900, description: 'TDS 1.5% sec 88 contract' },
      { account: ap, debit: 0, credit: 66900, description: 'Net payable' },
    ]
  )

  // 7. Office rent payment — Magh 5, 2082 (TDS 10% on rent)
  await postVoucher(
    '2082-10-05', new Date(2026, 0, 18),
    'Office rent payment for Magh 2082 — TDS 10% on rent',
    'PAYMENT',
    [
      { account: rentExpense, debit: 30000, credit: 0, description: 'Rent expense' },
      { account: tdsPayable, debit: 0, credit: 3000, description: 'TDS 10% on rent sec 88' },
      { account: bank, debit: 0, credit: 27000, description: 'Net payment via bank' },
    ]
  )

  // 8. Salary payment — Falgun 28, 2082 (simplified)
  await postVoucher(
    '2082-11-28', new Date(2026, 2, 11),
    'Salary payment for Falgun 2082 (simplified — no SSF breakdown)',
    'PAYMENT',
    [
      { account: salaryExpense, debit: 43000, credit: 0, description: 'Salary expense' },
      { account: bank, debit: 0, credit: 43000, description: 'Net salary paid' },
    ]
  )

  // 9. Customer payment received — Chaitra 10, 2082
  await postVoucher(
    '2082-12-10', new Date(2026, 2, 22),
    'Payment received from Annapurna (against INV-20820510-001)',
    'RECEIPT',
    [
      { account: bank, debit: 56500, credit: 0, description: 'Bank receipt' },
      { account: ar, debit: 0, credit: 56500, description: 'Receivable cleared' },
    ]
  )

  // 10. Sales invoice in current BS month (Ashar 2083) — recent
  await db.invoice.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      invoiceNo: 'INV-20830315-001',
      invoiceType: 'TAX_INVOICE',
      bsDate: '2083-03-15',
      adDate: new Date(2026, 6, 14),
      partyId: customer1.id,
      panBuyer: customer1.pan,
      subtotal: 42000,
      discountAmount: 0,
      taxableAmount: 42000,
      vatAmount: 5460,
      zeroRatedAmount: 0,
      exemptAmount: 0,
      totalAmount: 47460,
      currency: 'NPR',
      exchangeRate: 1,
      status: 'UNPAID',
      qrData: JSON.stringify({ invoice_no: 'INV-20830315-001', date: '2083-03-15', seller_pan: '601234567', buyer_pan: '602345678', total: 47460, vat: 5460 }),
      lines: {
        create: [
          { description: 'Trading goods - Lot C', quantity: 4, unit: 'PCS', rate: 10500, taxableAmount: 42000, vatRate: 13, vatAmount: 5460, totalAmount: 47460 },
        ],
      },
    },
  })
  await postVoucher(
    '2083-03-15', new Date(2026, 6, 14),
    'Sales invoice INV-20830315-001 — Annapurna (current month)',
    'SALES',
    [
      { account: ar, debit: 47460, credit: 0, description: 'Receivable' },
      { account: salesTaxable, debit: 0, credit: 42000, description: 'Taxable sales' },
      { account: outputVat, debit: 0, credit: 5460, description: 'Output VAT 13%' },
    ]
  )

  console.log('✅ Demo transactions created:')
  console.log('   - 4 sales invoices (3 taxable, 1 exempt)')
  console.log('   - 1 purchase bill with TDS')
  console.log('   - 1 rent payment with TDS')
  console.log('   - 1 salary payment')
  console.log('   - 1 customer receipt')
  console.log('   - 1 capital introduction')
  console.log('   - Total 10 vouchers posted')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
