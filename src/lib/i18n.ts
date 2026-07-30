// ============================================================
// Bilingual labels (English + Nepali Devanagari)
// Used by all UI components via the useI18n hook
// ============================================================

export type Language = 'en' | 'ne'

export const translations = {
  // Common
  appName: { en: 'Nepal Accounting System', ne: 'नेपाली लेखा प्रणाली' },
  save: { en: 'Save', ne: 'सेभ गर्नुहोस्' },
  cancel: { en: 'Cancel', ne: 'रद्द गर्नुहोस्' },
  add: { en: 'Add', ne: 'थप्नुहोस्' },
  delete: { en: 'Delete', ne: 'मेटाउनुहोस्' },
  edit: { en: 'Edit', ne: 'सम्पादन' },
  view: { en: 'View', ne: 'हेर्नुहोस्' },
  search: { en: 'Search', ne: 'खोज्नुहोस्' },
  loading: { en: 'Loading...', ne: 'लोड हुँदै...' },
  total: { en: 'Total', ne: 'जम्मा' },
  status: { en: 'Status', ne: 'स्थिति' },
  date: { en: 'Date', ne: 'मिति' },
  amount: { en: 'Amount', ne: 'रकम' },
  description: { en: 'Description', ne: 'विवरण' },
  export: { en: 'Export', ne: 'निर्यात' },
  exportPdf: { en: 'Export PDF', ne: 'PDF निर्यात' },
  exportExcel: { en: 'Export Excel', ne: 'एक्सेल निर्यात' },

  // Navigation
  navOverview: { en: 'Overview', ne: 'सिंहावलोकन' },
  navTransactions: { en: 'Transactions', ne: 'लेनदेन' },
  navMaster: { en: 'Master Data', ne: 'मास्टर डाटा' },
  navTaxCompliance: { en: 'Tax & Compliance', ne: 'कर र अनुपालन' },
  navReports: { en: 'Reports', ne: 'रिपोर्ट' },
  navInventory: { en: 'Inventory', ne: 'मौज्दात' },
  navFixedAssets: { en: 'Fixed Assets', ne: 'स्थिर सम्पत्ति' },

  // Sidebar items
  dashboard: { en: 'Dashboard', ne: 'ड्यासबोर्ड' },
  newInvoice: { en: 'New Sales Invoice', ne: 'नयाँ बिक्री बिल' },
  salesInvoices: { en: 'Sales Invoices', ne: 'बिक्री बिलहरू' },
  purchaseBills: { en: 'Purchase Bills', ne: 'खरिद बिलहरू' },
  journalVouchers: { en: 'Journal Vouchers', ne: 'जर्नल भौचर' },
  parties: { en: 'Customers & Suppliers', ne: 'ग्राहक र आपूर्तिकर्ता' },
  chartOfAccounts: { en: 'Chart of Accounts', ne: 'खाता वर्गीकरण' },
  items: { en: 'Items & Inventory', ne: 'सामान र मौज्दात' },
  stockMovements: { en: 'Stock Movements', ne: 'मौज्दात आवगमन' },
  fixedAssets: { en: 'Fixed Assets Register', ne: 'स्थिर सम्पत्ति रजिस्टर' },
  vatReturn: { en: 'VAT Return (V48)', ne: 'VAT रिटर्न (V48)' },
  payroll: { en: 'Payroll & SSF', ne: 'तलब र SSF' },
  trialBalance: { en: 'Trial Balance', ne: 'तलपाना' },
  profitLoss: { en: 'Profit & Loss', ne: 'नाफा नोक्सान' },
  balanceSheet: { en: 'Balance Sheet', ne: 'ब्यालेन्स सिट' },
  fxRates: { en: 'FX Rates (NRB)', ne: 'विदेशी मुद्रा दर (नेरा)' },
  tenants: { en: 'Companies', ne: 'कम्पनीहरू' },
  settings: { en: 'Settings', ne: 'सेटिङ्स' },
  creditNotes: { en: 'Credit Notes', ne: 'क्रेडिट नोट' },
  debitNotes: { en: 'Debit Notes', ne: 'डेबिट नोट' },
  cashFlow: { en: 'Cash Flow', ne: 'नगद प्रवाह' },
  auditLog: { en: 'Audit Log', ne: 'अडिट लग' },

  // Dashboard
  cashInHand: { en: 'Cash in Hand', ne: 'नगद' },
  cashAtBank: { en: 'Cash at Bank', ne: 'बैंकमा नगद' },
  accountsReceivable: { en: 'Accounts Receivable', ne: 'प्राप्य' },
  accountsPayable: { en: 'Accounts Payable', ne: 'भुक्तानीयोग्य' },
  outputVat: { en: 'Output VAT', ne: 'बिक्री VAT' },
  inputVat: { en: 'Input VAT', ne: 'खरिद VAT' },
  netVatPayable: { en: 'Net VAT Payable', ne: 'कुल VAT भुक्तानीयोग्य' },
  tdsPayable: { en: 'TDS Payable', ne: 'TDS भुक्तानीयोग्य' },
  fiscalYear: { en: 'Fiscal Year', ne: 'आर्थिक वर्ष' },
  netProfit: { en: 'Net Profit', ne: 'खुद मुनाफा' },
  income: { en: 'Income', ne: 'आम्दानी' },
  expense: { en: 'Expense', ne: 'खर्च' },
  recentInvoices: { en: 'Recent Sales Invoices', ne: 'हालैका बिक्री बिल' },
  recentVouchers: { en: 'Recent Journal Vouchers', ne: 'हालैका जर्नल भौचर' },
  upcomingDeadlines: { en: 'Upcoming Compliance Deadlines', ne: 'आगामी अनुपालन म्यादहरू' },
  taxCompliance: { en: 'Tax Compliance Dashboard', ne: 'कर अनुपालन ड्यासबोर्ड' },

  // Invoice
  customer: { en: 'Customer', ne: 'ग्राहक' },
  supplier: { en: 'Supplier', ne: 'आपूर्तिकर्ता' },
  panNumber: { en: 'PAN', ne: 'PAN' },
  vatPercent: { en: 'VAT %', ne: 'VAT %' },
  quantity: { en: 'Qty', ne: 'परिमाण' },
  unit: { en: 'Unit', ne: 'एकाइ' },
  rate: { en: 'Rate', ne: 'दर' },
  taxableAmount: { en: 'Taxable Amount', ne: 'कर लाग्ने रकम' },
  vatAmount: { en: 'VAT Amount', ne: 'VAT रकम' },
  invoiceNo: { en: 'Invoice No', ne: 'बिल नम्बर' },
  billNo: { en: 'Bill No', ne: 'बिल नम्बर' },

  // Inventory
  sku: { en: 'SKU', ne: 'SKU' },
  itemName: { en: 'Item Name', ne: 'सामानको नाम' },
  stock: { en: 'Stock', ne: 'मौज्दात' },
  stockValue: { en: 'Stock Value', ne: 'मौज्दात मूल्य' },
  reorderLevel: { en: 'Reorder Level', ne: 'पुनः अर्डर स्तर' },

  // Fixed Assets
  assetCode: { en: 'Asset Code', ne: 'सम्पत्ति कोड' },
  assetName: { en: 'Asset Name', ne: 'सम्पत्ति नाम' },
  category: { en: 'Category', ne: 'वर्ग' },
  acquisitionDate: { en: 'Acquisition Date', ne: 'खरिद मिति' },
  cost: { en: 'Cost', ne: 'लागत' },
  depreciation: { en: 'Depreciation', ne: 'ह्रासकट्टी' },
  bookValue: { en: 'Book Value', ne: 'बही मूल्य' },

  // Tax
  ssf: { en: 'Social Security Fund (SSF)', ne: 'सामाजिक सुरक्षा कोष' },
  ssfEmployee: { en: 'SSF Employee (11%)', ne: 'SSF कर्मचारी (११%)' },
  ssfEmployer: { en: 'SSF Employer (20%)', ne: 'SSF रोजगारदाता (२०%)' },
  tds: { en: 'TDS', ne: 'TDS' },
  payrollLabel: { en: 'Payroll', ne: 'तलब' },
} as const

export type TranslationKey = keyof typeof translations

export function translate(key: TranslationKey, lang: Language): string {
  const entry = translations[key]
  if (!entry) return key as string
  return entry[lang]
}
