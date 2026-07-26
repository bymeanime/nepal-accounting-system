// ============================================================
// Nepal Chart of Accounts — Default template
// Based on Schedule V (Nepal Companies Act) format
// ============================================================

export interface SeedAccount {
  code: string
  name: string
  nameNp: string
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
  subType: string
  isGroup: boolean
  isCash?: boolean
  isBank?: boolean
  parentId?: string // code reference (resolved at seed time)
  sortOrder?: number
}

// Top-level groups first, then leaf accounts with parentId
export const NEPAL_CHART_OF_ACCOUNTS: SeedAccount[] = [
  // ========== ASSETS ==========
  { code: '1', name: 'Assets', nameNp: 'सम्पत्ति', type: 'ASSET', subType: '', isGroup: true, sortOrder: 1 },
  { code: '10', name: 'Current Assets', nameNp: 'चालू सम्पत्ति', type: 'ASSET', subType: 'CURRENT_ASSET', isGroup: true, parentId: '1', sortOrder: 1 },
  { code: '1001', name: 'Cash in Hand', nameNp: 'नगद', type: 'ASSET', subType: 'CURRENT_ASSET', isGroup: false, isCash: true, parentId: '10', sortOrder: 1 },
  { code: '1002', name: 'Cash at Bank - NPR', nameNp: 'बैंक (रुपैयाँ)', type: 'ASSET', subType: 'CURRENT_ASSET', isGroup: false, isBank: true, parentId: '10', sortOrder: 2 },
  { code: '1003', name: 'Cash at Bank - USD', nameNp: 'बैंक (डलर)', type: 'ASSET', subType: 'CURRENT_ASSET', isGroup: false, isBank: true, parentId: '10', sortOrder: 3 },
  { code: '1010', name: 'Accounts Receivable', nameNp: 'प्राप्य', type: 'ASSET', subType: 'CURRENT_ASSET', isGroup: false, parentId: '10', sortOrder: 4 },
  { code: '1020', name: 'Advances to Suppliers', nameNp: 'अग्रिम भुक्तानी', type: 'ASSET', subType: 'CURRENT_ASSET', isGroup: false, parentId: '10', sortOrder: 5 },
  { code: '1030', name: 'TDS Receivable', nameNp: 'TDS प्राप्य', type: 'ASSET', subType: 'CURRENT_ASSET', isGroup: false, parentId: '10', sortOrder: 6 },
  { code: '1040', name: 'Input VAT (Purchase VAT)', nameNp: 'खरिद VAT', type: 'ASSET', subType: 'CURRENT_ASSET', isGroup: false, parentId: '10', sortOrder: 7 },
  { code: '1050', name: 'Inventory - Raw Materials', nameNp: 'कच्चा माल', type: 'ASSET', subType: 'CURRENT_ASSET', isGroup: false, parentId: '10', sortOrder: 8 },
  { code: '1051', name: 'Inventory - Work in Progress', nameNp: 'अपूर्ण माल', type: 'ASSET', subType: 'CURRENT_ASSET', isGroup: false, parentId: '10', sortOrder: 9 },
  { code: '1052', name: 'Inventory - Finished Goods', nameNp: 'तयार माल', type: 'ASSET', subType: 'CURRENT_ASSET', isGroup: false, parentId: '10', sortOrder: 10 },
  { code: '1060', name: 'Prepaid Expenses', nameNp: 'अग्रिम खर्च', type: 'ASSET', subType: 'CURRENT_ASSET', isGroup: false, parentId: '10', sortOrder: 11 },
  { code: '1070', name: 'Advance Income Tax', nameNp: 'अग्रिम कर', type: 'ASSET', subType: 'CURRENT_ASSET', isGroup: false, parentId: '10', sortOrder: 12 },

  { code: '11', name: 'Fixed Assets', nameNp: 'स्थिर सम्पत्ति', type: 'ASSET', subType: 'FIXED_ASSET', isGroup: true, parentId: '1', sortOrder: 2 },
  { code: '1101', name: 'Land', nameNp: 'जग्गा', type: 'ASSET', subType: 'FIXED_ASSET', isGroup: false, parentId: '11', sortOrder: 1 },
  { code: '1102', name: 'Building', nameNp: 'भवन', type: 'ASSET', subType: 'FIXED_ASSET', isGroup: false, parentId: '11', sortOrder: 2 },
  { code: '1103', name: 'Plant & Machinery', nameNp: 'मेशिनरी', type: 'ASSET', subType: 'FIXED_ASSET', isGroup: false, parentId: '11', sortOrder: 3 },
  { code: '1104', name: 'Vehicle', nameNp: 'सवारी', type: 'ASSET', subType: 'FIXED_ASSET', isGroup: false, parentId: '11', sortOrder: 4 },
  { code: '1105', name: 'Furniture & Fixtures', nameNp: 'फर्निचर', type: 'ASSET', subType: 'FIXED_ASSET', isGroup: false, parentId: '11', sortOrder: 5 },
  { code: '1106', name: 'Computer & IT Equipment', nameNp: 'कम्प्युटर', type: 'ASSET', subType: 'FIXED_ASSET', isGroup: false, parentId: '11', sortOrder: 6 },
  { code: '1107', name: 'Accumulated Depreciation', nameNp: 'ह्रासको थुप्रो', type: 'ASSET', subType: 'FIXED_ASSET', isGroup: false, parentId: '11', sortOrder: 7 },

  { code: '12', name: 'Non-Current Assets', nameNp: 'गैर-चालू सम्पत्ति', type: 'ASSET', subType: 'NON_CURRENT_ASSET', isGroup: true, parentId: '1', sortOrder: 3 },
  { code: '1201', name: 'Intangible Assets', nameNp: 'अमूर्त सम्पत्ति', type: 'ASSET', subType: 'NON_CURRENT_ASSET', isGroup: false, parentId: '12', sortOrder: 1 },
  { code: '1202', name: 'Investments - Long Term', nameNp: 'लगानी', type: 'ASSET', subType: 'NON_CURRENT_ASSET', isGroup: false, parentId: '12', sortOrder: 2 },

  // ========== LIABILITIES ==========
  { code: '2', name: 'Liabilities', nameNp: 'दायित्व', type: 'LIABILITY', subType: '', isGroup: true, sortOrder: 2 },
  { code: '20', name: 'Current Liabilities', nameNp: 'चालू दायित्व', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', isGroup: true, parentId: '2', sortOrder: 1 },
  { code: '2001', name: 'Accounts Payable', nameNp: 'भुक्तानीयोग्य', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', isGroup: false, parentId: '20', sortOrder: 1 },
  { code: '2002', name: 'Advances from Customers', nameNp: 'ग्राहक अग्रिम', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', isGroup: false, parentId: '20', sortOrder: 2 },
  { code: '2003', name: 'Output VAT (Sales VAT)', nameNp: 'बिक्री VAT', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', isGroup: false, parentId: '20', sortOrder: 3 },
  { code: '2004', name: 'TDS Payable', nameNp: 'TDS भुक्तानीयोग्य', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', isGroup: false, parentId: '20', sortOrder: 4 },
  { code: '2005', name: 'SSF Payable', nameNp: 'SSF भुक्तानीयोग्य', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', isGroup: false, parentId: '20', sortOrder: 5 },
  { code: '2006', name: 'Salary Payable', nameNp: 'तलब भुक्तानीयोग्य', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', isGroup: false, parentId: '20', sortOrder: 6 },
  { code: '2007', name: 'Income Tax Payable', nameNp: 'आयकर भुक्तानीयोग्य', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', isGroup: false, parentId: '20', sortOrder: 7 },
  { code: '2008', name: 'Excise Duty Payable', nameNp: 'अन्तःशुल्क', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', isGroup: false, parentId: '20', sortOrder: 8 },
  { code: '2009', name: 'DST Payable', nameNp: 'DST भुक्तानीयोग्य', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', isGroup: false, parentId: '20', sortOrder: 9 },
  { code: '2010', name: 'Accrued Expenses', nameNp: 'जम्मा खर्च', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', isGroup: false, parentId: '20', sortOrder: 10 },

  { code: '21', name: 'Non-Current Liabilities', nameNp: 'गैर-चालू दायित्व', type: 'LIABILITY', subType: 'LONG_TERM_LIABILITY', isGroup: true, parentId: '2', sortOrder: 2 },
  { code: '2101', name: 'Long Term Loans', nameNp: 'दीर्घकालीन ऋण', type: 'LIABILITY', subType: 'LONG_TERM_LIABILITY', isGroup: false, parentId: '21', sortOrder: 1 },
  { code: '2102', name: 'Bank Loans', nameNp: 'बैंक ऋण', type: 'LIABILITY', subType: 'LONG_TERM_LIABILITY', isGroup: false, parentId: '21', sortOrder: 2 },
  { code: '2103', name: 'Lease Liabilities', nameNp: 'लिज दायित्व', type: 'LIABILITY', subType: 'LONG_TERM_LIABILITY', isGroup: false, parentId: '21', sortOrder: 3 },

  // ========== EQUITY ==========
  { code: '3', name: 'Equity / Capital', nameNp: 'पुँजी', type: 'EQUITY', subType: '', isGroup: true, sortOrder: 3 },
  { code: '3001', name: 'Owner\'s Capital', nameNp: 'मालिक पुँजी', type: 'EQUITY', subType: '', isGroup: false, parentId: '3', sortOrder: 1 },
  { code: '3002', name: 'Share Capital', nameNp: 'सेयर पुँजी', type: 'EQUITY', subType: '', isGroup: false, parentId: '3', sortOrder: 2 },
  { code: '3003', name: 'Retained Earnings', nameNp: 'सञ्चित मुनाफा', type: 'EQUITY', subType: '', isGroup: false, parentId: '3', sortOrder: 3 },
  { code: '3004', name: 'Reserves & Surplus', nameNp: 'रिजर्भ', type: 'EQUITY', subType: '', isGroup: false, parentId: '3', sortOrder: 4 },
  { code: '3005', name: 'Drawings', nameNp: 'आहरण', type: 'EQUITY', subType: '', isGroup: false, parentId: '3', sortOrder: 5 },

  // ========== INCOME ==========
  { code: '4', name: 'Income / Revenue', nameNp: 'आम्दानी', type: 'INCOME', subType: '', isGroup: true, sortOrder: 4 },
  { code: '4001', name: 'Sales Revenue - Taxable', nameNp: 'बिक्री (VAT लाग्य)', type: 'INCOME', subType: 'OPERATING', isGroup: false, parentId: '4', sortOrder: 1 },
  { code: '4002', name: 'Sales Revenue - Zero Rated', nameNp: 'बिक्री (शून्य दर)', type: 'INCOME', subType: 'OPERATING', isGroup: false, parentId: '4', sortOrder: 2 },
  { code: '4003', name: 'Sales Revenue - Exempt', nameNp: 'बिक्री (छुट)', type: 'INCOME', subType: 'OPERATING', isGroup: false, parentId: '4', sortOrder: 3 },
  { code: '4004', name: 'Service Income - Taxable', nameNp: 'सेवा आम्दानी', type: 'INCOME', subType: 'OPERATING', isGroup: false, parentId: '4', sortOrder: 4 },
  { code: '4005', name: 'Other Operating Income', nameNp: 'अन्य आम्दानी', type: 'INCOME', subType: 'OPERATING', isGroup: false, parentId: '4', sortOrder: 5 },
  { code: '4006', name: 'Interest Income', nameNp: 'ब्याज आम्दानी', type: 'INCOME', subType: 'NON_OPERATING', isGroup: false, parentId: '4', sortOrder: 6 },
  { code: '4007', name: 'Discount Received', nameNp: 'छुट प्राप्त', type: 'INCOME', subType: 'OPERATING', isGroup: false, parentId: '4', sortOrder: 7 },
  { code: '4008', name: 'Gain on Sale of Fixed Assets', nameNp: 'स्थिर सम्पत्ति बिक्री नाफा', type: 'INCOME', subType: 'NON_OPERATING', isGroup: false, parentId: '4', sortOrder: 8 },

  // ========== EXPENSES ==========
  { code: '5', name: 'Expenses', nameNp: 'खर्च', type: 'EXPENSE', subType: '', isGroup: true, sortOrder: 5 },
  { code: '50', name: 'Cost of Goods Sold', nameNp: 'बिक्री लागत', type: 'EXPENSE', subType: 'COGS', isGroup: true, parentId: '5', sortOrder: 1 },
  { code: '5001', name: 'Opening Stock', nameNp: 'सुरुको मौज्दात', type: 'EXPENSE', subType: 'COGS', isGroup: false, parentId: '50', sortOrder: 1 },
  { code: '5002', name: 'Purchases - Taxable', nameNp: 'खरिद (VAT लाग्य)', type: 'EXPENSE', subType: 'COGS', isGroup: false, parentId: '50', sortOrder: 2 },
  { code: '5003', name: 'Purchases - Zero Rated', nameNp: 'खरिद (शून्य दर)', type: 'EXPENSE', subType: 'COGS', isGroup: false, parentId: '50', sortOrder: 3 },
  { code: '5004', name: 'Purchases - Exempt', nameNp: 'खरिद (छुट)', type: 'EXPENSE', subType: 'COGS', isGroup: false, parentId: '50', sortOrder: 4 },
  { code: '5005', name: 'Closing Stock', nameNp: 'अन्तिम मौज्दात', type: 'EXPENSE', subType: 'COGS', isGroup: false, parentId: '50', sortOrder: 5 },
  { code: '5006', name: 'Direct Labour', nameNp: 'प्रत्यक्ष श्रम', type: 'EXPENSE', subType: 'COGS', isGroup: false, parentId: '50', sortOrder: 6 },
  { code: '5007', name: 'Manufacturing Overheads', nameNp: 'उत्पादन खर्च', type: 'EXPENSE', subType: 'COGS', isGroup: false, parentId: '50', sortOrder: 7 },

  { code: '51', name: 'Administrative Expenses', nameNp: 'प्रशासनिक खर्च', type: 'EXPENSE', subType: 'ADMIN', isGroup: true, parentId: '5', sortOrder: 2 },
  { code: '5101', name: 'Salaries & Wages', nameNp: 'तलब', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 1 },
  { code: '5102', name: 'SSF Employer Contribution', nameNp: 'SSF (मालिक)', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 2 },
  { code: '5103', name: 'Staff Welfare', nameNp: 'कर्मचारी कल्याण', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 3 },
  { code: '5104', name: 'Rent Expense', nameNp: 'घरबहाला', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 4 },
  { code: '5105', name: 'Utilities (Electricity, Water)', nameNp: 'युटिलिटी', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 5 },
  { code: '5106', name: 'Telephone & Internet', nameNp: 'टेलिफोन', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 6 },
  { code: '5107', name: 'Office Supplies', nameNp: 'कार्यालय सामग्री', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 7 },
  { code: '5108', name: 'Printing & Stationery', nameNp: 'मुद्रण', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 8 },
  { code: '5109', name: 'Insurance', nameNp: 'बीमा', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 9 },
  { code: '5110', name: 'Repairs & Maintenance', nameNp: 'मर्मत', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 10 },
  { code: '5111', name: 'Audit Fee', nameNp: 'लेखापरीक्षण शुल्क', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 11 },
  { code: '5112', name: 'Legal & Professional Fee', nameNp: 'कानुनी शुल्क', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 12 },
  { code: '5113', name: 'Bank Charges', nameNp: 'बैंक शुल्क', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 13 },
  { code: '5114', name: 'Depreciation', nameNp: 'ह्रासकट्टी', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 14 },
  { code: '5115', name: 'Travel & Transportation', nameNp: 'यात्रा भत्ता', type: 'EXPENSE', subType: 'ADMIN', isGroup: false, parentId: '51', sortOrder: 15 },

  { code: '52', name: 'Selling & Distribution', nameNp: 'बिक्री वितरण', type: 'EXPENSE', subType: 'SELLING', isGroup: true, parentId: '5', sortOrder: 3 },
  { code: '5201', name: 'Advertisement', nameNp: 'विज्ञापन', type: 'EXPENSE', subType: 'SELLING', isGroup: false, parentId: '52', sortOrder: 1 },
  { code: '5202', name: 'Commission Paid', nameNp: 'कमिसन', type: 'EXPENSE', subType: 'SELLING', isGroup: false, parentId: '52', sortOrder: 2 },
  { code: '5203', name: 'Transport (Outward)', nameNp: 'वितरण यातायात', type: 'EXPENSE', subType: 'SELLING', isGroup: false, parentId: '52', sortOrder: 3 },
  { code: '5204', name: 'Discount Allowed', nameNp: 'छुट दिइएको', type: 'EXPENSE', subType: 'SELLING', isGroup: false, parentId: '52', sortOrder: 4 },
  { code: '5205', name: 'Bad Debts', nameNp: 'नौलो ऋण', type: 'EXPENSE', subType: 'SELLING', isGroup: false, parentId: '52', sortOrder: 5 },

  { code: '53', name: 'Financial Expenses', nameNp: 'वित्तीय खर्च', type: 'EXPENSE', subType: 'FINANCIAL', isGroup: true, parentId: '5', sortOrder: 4 },
  { code: '5301', name: 'Interest Expense', nameNp: 'ब्याज खर्च', type: 'EXPENSE', subType: 'FINANCIAL', isGroup: false, parentId: '53', sortOrder: 1 },
  { code: '5302', name: 'Bank Interest', nameNp: 'बैंक ब्याज', type: 'EXPENSE', subType: 'FINANCIAL', isGroup: false, parentId: '53', sortOrder: 2 },
  { code: '5303', name: 'Forex Loss', nameNp: 'विदेशी मुद्रा नोक्सान', type: 'EXPENSE', subType: 'FINANCIAL', isGroup: false, parentId: '53', sortOrder: 3 },

  { code: '54', name: 'Tax Expenses', nameNp: 'कर खर्च', type: 'EXPENSE', subType: 'TAX', isGroup: true, parentId: '5', sortOrder: 5 },
  { code: '5401', name: 'Income Tax (Current)', nameNp: 'चालू आयकर', type: 'EXPENSE', subType: 'TAX', isGroup: false, parentId: '54', sortOrder: 1 },
  { code: '5402', name: 'Income Tax (Deferred)', nameNp: 'स्थगित आयकर', type: 'EXPENSE', subType: 'TAX', isGroup: false, parentId: '54', sortOrder: 2 },
  { code: '5403', name: 'Excise Duty Expense', nameNp: 'अन्तःशुल्क', type: 'EXPENSE', subType: 'TAX', isGroup: false, parentId: '54', sortOrder: 3 },
  { code: '5404', name: 'DST Expense', nameNp: 'DST', type: 'EXPENSE', subType: 'TAX', isGroup: false, parentId: '54', sortOrder: 4 },
]
