// ============================================================
// Tax Engine — Nepal Tax Rules
// Resolves the applicable VAT/TDS/SSF/Income Tax rate for a given BS date.
// All rules are configurable via DB (TaxRule model) so Finance Act changes
// every Shrawan 1 don't require code changes.
// ============================================================

import { db } from '@/lib/db'
import { parseBsDate, todayBsString } from '@/lib/nepaliCalendar'

// ============================================================
// Standard Nepal tax rates (FY 2082/83 – 2083/84)
// Used for seeding + as fallback constants.
// ============================================================

export const DEFAULT_VAT_RATES = {
  STANDARD: 13,
  ZERO_RATED: 0,
  RIDE_SHARE: 5, // FY 2083/84
}

export const DEFAULT_TDS_RATES: Record<string, { rate: number; threshold: number; label: string; labelNp: string }> = {
  '88_RENT_LAND': { rate: 10, threshold: 0, label: 'Rent of Land/Building (Resident)', labelNp: 'घरबहाला' },
  '88_RENT_BUILDING': { rate: 10, threshold: 0, label: 'Rent of Building (Resident)', labelNp: 'घरबहाला' },
  '88_INTEREST_DEPOSIT': { rate: 6, threshold: 0, label: 'Interest on Deposit', labelNp: 'ब्याज' },
  '88_INTEREST_LOAN': { rate: 10, threshold: 0, label: 'Interest on Loan (Resident)', labelNp: 'ऋणको ब्याज' },
  '88_INTEREST_NR': { rate: 15, threshold: 0, label: 'Interest (Non-Resident)', labelNp: 'गैर आवासीय ब्याज' },
  '88_CONTRACT': { rate: 1.5, threshold: 50000, label: 'Contract Payment', labelNp: 'ठेक्का भुक्तानी' },
  '88_CONTRACT_NR': { rate: 5, threshold: 50000, label: 'Contract Payment (Non-Resident)', labelNp: 'गैर आवासीय ठेक्का' },
  '88_TRANSPORT': { rate: 1.5, threshold: 50000, label: 'Transport/Freight', labelNp: 'यातायात' },
  '88_ROYALTY': { rate: 15, threshold: 0, label: 'Royalty', labelNp: 'रोयल्टी' },
  '88_TECH_SERVICE': { rate: 15, threshold: 0, label: 'Technical Service Fee', labelNp: 'प्राविधिक सेवा' },
  '88_COMMISSION': { rate: 15, threshold: 0, label: 'Commission', labelNp: 'कमिसन' },
  '88_DIVIDEND_R': { rate: 5, threshold: 0, label: 'Dividend (Resident)', labelNp: 'लाभांश' },
  '88_DIVIDEND_NR': { rate: 7.5, threshold: 0, label: 'Dividend (Non-Resident)', labelNp: 'गैर आवासीय लाभांश' },
  '88_WINDFALL': { rate: 25, threshold: 50000, label: 'Windfall Gain', labelNp: 'अनपेक्षित लाभ' },
  '88_RETIREMENT_PAYOUT': { rate: 5, threshold: 0, label: 'Retirement Fund Payout', labelNp: 'सेवा निवृत्ति' },
  '88_INSURANCE_NR': { rate: 1.5, threshold: 0, label: 'Insurance Premium (Non-Resident)', labelNp: 'बीमा' },
  '88_ADVERTISEMENT': { rate: 15, threshold: 0, label: 'Advertisement Fee (Non-Resident)', labelNp: 'विज्ञापन' },
}

// ============================================================
// Income Tax slabs for individuals (FY 2083/84 — top rate 29%)
// ============================================================
export interface IncomeTaxSlab {
  upTo: number | null   // null = infinity
  rate: number          // percent
}

export const INDIVIDUAL_TAX_SLABS_2083: IncomeTaxSlab[] = [
  { upTo: 1000000, rate: 0 },    // exemption
  { upTo: 2000000, rate: 10 },
  { upTo: 3000000, rate: 20 },
  { upTo: 4000000, rate: 25 },
  { upTo: null, rate: 29 },      // top rate reduced from 39% in FY 2083/84
]

export const CORPORATE_TAX_RATES = {
  NORMAL_BUSINESS: 25,
  BANK_INSURANCE_TELECOM: 30,
  SPECIAL_INDUSTRIES_LISTED: 20,
  COTTAGE_AGRO_PRIORITY: 5,
  NON_RESIDENT: 25,
}

// ============================================================
// SSF Contribution Rates (effective from FY 2076/77)
// ============================================================
export const SSF_RATES = {
  EMPLOYEE_PCT_OF_BASIC: 11,
  EMPLOYER_PCT_OF_BASIC: 20, // 8.33% gratuity + 1.67% additional + ~10% breakdown
  TOTAL: 31,
}

// ============================================================
// Income Tax Act — Depreciation Rates (% per annum)
// Used for Fixed Asset module
// ============================================================
export const DEPRECIATION_RATES: Record<string, { rate: number; method: 'WDV' | 'SLM'; label: string }> = {
  BUILDING_NON_FACTORY: { rate: 5, method: 'SLM', label: 'Building (Non-Factory)' },
  BUILDING_FACTORY: { rate: 10, method: 'SLM', label: 'Building (Factory)' },
  PLANT_MACHINERY: { rate: 15, method: 'WDV', label: 'Plant & Machinery' },
  VEHICLE: { rate: 20, method: 'WDV', label: 'Vehicle' },
  FURNITURE_FIXTURES: { rate: 12.5, method: 'WDV', label: 'Furniture & Fixtures' },
  IT_EQUIPMENT: { rate: 25, method: 'WDV', label: 'IT Equipment / Computers' },
  INTANGIBLE_SOFTWARE: { rate: 25, method: 'SLM', label: 'Computer Software' },
  OFFICE_EQUIPMENT: { rate: 15, method: 'WDV', label: 'Office Equipment' },
}

// ============================================================
// Tax Rule Resolver — finds the applicable rule for a given BS date
// ============================================================

export interface ResolvedTaxRule {
  taxType: string
  section: string
  rate: number
  thresholdMin: number
  thresholdMax: number | null
  name: string
}

export async function resolveTaxRule(
  tenantId: string,
  taxType: string,
  section: string,
  bsDate: string = todayBsString()
): Promise<ResolvedTaxRule | null> {
  const rules = await db.taxRule.findMany({
    where: {
      tenantId,
      taxType,
      section,
      effectiveFromBs: { lte: bsDate },
      OR: [
        { effectiveToBs: null },
        { effectiveToBs: { gte: bsDate } },
      ],
    },
    orderBy: { effectiveFromBs: 'desc' },
    take: 1,
  })
  if (rules.length === 0) {
    // Fallback to default rates
    if (taxType === 'VAT') {
      const defaultRate = section === 'RIDE_SHARE' ? DEFAULT_VAT_RATES.RIDE_SHARE : DEFAULT_VAT_RATES.STANDARD
      return {
        taxType,
        section,
        rate: defaultRate,
        thresholdMin: 0,
        thresholdMax: null,
        name: `VAT ${section} (default)`,
      }
    }
    if (taxType === 'TDS') {
      const def = DEFAULT_TDS_RATES[section]
      if (def) {
        return {
          taxType,
          section,
          rate: def.rate,
          thresholdMin: def.threshold,
          thresholdMax: null,
          name: def.label,
        }
      }
    }
    if (taxType === 'SSF') {
      const rate = section === 'EMPLOYEE' ? SSF_RATES.EMPLOYEE_PCT_OF_BASIC : SSF_RATES.EMPLOYER_PCT_OF_BASIC
      return {
        taxType,
        section,
        rate,
        thresholdMin: 0,
        thresholdMax: null,
        name: `SSF ${section}`,
      }
    }
    return null
  }
  const r = rules[0]
  return {
    taxType: r.taxType,
    section: r.section || '',
    rate: Number(r.rate),
    thresholdMin: Number(r.thresholdMin),
    thresholdMax: r.thresholdMax ? Number(r.thresholdMax) : null,
    name: r.name,
  }
}

// ============================================================
// VAT Calculation
// ============================================================
export interface VatCalculation {
  subtotal: number
  discountAmount: number
  taxableAmount: number
  vatRate: number
  vatAmount: number
  zeroRatedAmount: number
  exemptAmount: number
  totalAmount: number
}

export function calculateVat(
  lineItems: Array<{
    amount: number
    vatRate: number
    isExempt?: boolean
    isZeroRated?: boolean
  }>,
  discountPct: number = 0
): VatCalculation {
  let taxableAmount = 0
  let vatAmount = 0
  let zeroRatedAmount = 0
  let exemptAmount = 0
  let effectiveVatRate = 13

  for (const item of lineItems) {
    if (item.isExempt) {
      exemptAmount += item.amount
    } else if (item.isZeroRated) {
      zeroRatedAmount += item.amount
    } else {
      taxableAmount += item.amount
      vatAmount += (item.amount * item.vatRate) / 100
      effectiveVatRate = item.vatRate
    }
  }

  const subtotal = taxableAmount + zeroRatedAmount + exemptAmount
  const discountAmount = (subtotal * discountPct) / 100
  const discountedTaxable = Math.max(0, taxableAmount - (discountAmount * taxableAmount) / Math.max(1, subtotal))
  const recalculatedVat = (discountedTaxable * effectiveVatRate) / 100

  return {
    subtotal,
    discountAmount,
    taxableAmount: discountedTaxable,
    vatRate: effectiveVatRate,
    vatAmount: recalculatedVat,
    zeroRatedAmount,
    exemptAmount,
    totalAmount: discountedTaxable + recalculatedVat + zeroRatedAmount + exemptAmount,
  }
}

// ============================================================
// TDS Calculation
// ============================================================
export interface TdsCalculation {
  section: string
  grossPayment: number
  threshold: number
  rate: number
  tdsAmount: number
  netPayment: number
  isTdsApplicable: boolean
}

export async function calculateTds(
  tenantId: string,
  section: string,
  grossPayment: number,
  bsDate: string = todayBsString()
): Promise<TdsCalculation> {
  const rule = await resolveTaxRule(tenantId, 'TDS', section, bsDate)
  const rate = rule?.rate ?? DEFAULT_TDS_RATES[section]?.rate ?? 0
  const threshold = rule?.thresholdMin ?? DEFAULT_TDS_RATES[section]?.threshold ?? 0
  const isTdsApplicable = grossPayment > threshold
  const tdsAmount = isTdsApplicable ? (grossPayment * rate) / 100 : 0

  return {
    section,
    grossPayment,
    threshold,
    rate,
    tdsAmount,
    netPayment: grossPayment - tdsAmount,
    isTdsApplicable,
  }
}

// ============================================================
// SSF Calculation (Social Security Fund)
// ============================================================
export interface SsfCalculation {
  basicSalary: number
  allowance: number
  grossSalary: number
  ssfEmployee: number   // 11% of basic
  ssfEmployer: number   // 20% of basic
  totalContribution: number // 31% of basic
}

export function calculateSsf(basicSalary: number, allowance: number = 0): SsfCalculation {
  const ssfEmployee = (basicSalary * SSF_RATES.EMPLOYEE_PCT_OF_BASIC) / 100
  const ssfEmployer = (basicSalary * SSF_RATES.EMPLOYER_PCT_OF_BASIC) / 100
  return {
    basicSalary,
    allowance,
    grossSalary: basicSalary + allowance,
    ssfEmployee,
    ssfEmployer,
    totalContribution: ssfEmployee + ssfEmployer,
  }
}

// ============================================================
// Income Tax (TDS on Salary) — Monthly estimation
// For residents: project annual taxable income, apply slabs, divide by 12
// ============================================================
export interface SalaryTdsCalculation {
  monthlyBasic: number
  monthlyAllowance: number
  monthlyGross: number
  monthlySsfEmployee: number      // 11% of basic, deductible from taxable
  annualTaxableIncome: number
  annualTax: number
  monthlyTax: number
  netMonthlySalary: number
}

export function calculateSalaryTds(
  monthlyBasic: number,
  monthlyAllowance: number = 0,
  slabs: IncomeTaxSlab[] = INDIVIDUAL_TAX_SLABS_2083
): SalaryTdsCalculation {
  const monthlyGross = monthlyBasic + monthlyAllowance
  const monthlySsfEmployee = (monthlyBasic * SSF_RATES.EMPLOYEE_PCT_OF_BASIC) / 100

  const annualBasic = monthlyBasic * 12
  const annualAllowance = monthlyAllowance * 12
  const annualSsfEmployee = monthlySsfEmployee * 12
  const annualGross = annualBasic + annualAllowance

  // Taxable income = gross - SSF employee contribution
  const annualTaxableIncome = Math.max(0, annualGross - annualSsfEmployee)

  // Apply slabs
  let annualTax = 0
  let prevLimit = 0
  for (const slab of slabs) {
    const upper = slab.upTo ?? Infinity
    if (annualTaxableIncome > prevLimit) {
      const taxableInSlab = Math.min(annualTaxableIncome, upper) - prevLimit
      annualTax += (taxableInSlab * slab.rate) / 100
      prevLimit = upper
    } else {
      break
    }
  }

  const monthlyTax = annualTax / 12
  const netMonthlySalary = monthlyGross - monthlySsfEmployee - monthlyTax

  return {
    monthlyBasic,
    monthlyAllowance,
    monthlyGross,
    monthlySsfEmployee,
    annualTaxableIncome,
    annualTax,
    monthlyTax,
    netMonthlySalary,
  }
}

// ============================================================
// VAT Return (Form V48) Computation
// ============================================================
export interface VatReturnData {
  periodBs: string              // "2082-04"
  // Output VAT (Sales side)
  taxableSales: number
  zeroRatedSales: number
  exemptSales: number
  outputVat: number
  // Input VAT (Purchase side)
  taxablePurchases: number
  inputVat: number
  // Net
  netVatPayable: number         // output - input (if positive)
  vatRefundable: number         // input - output (if positive, carried forward)
  // Breakdown
  totalSales: number
  totalPurchases: number
}

export function computeVatReturn(
  periodBs: string,
  sales: Array<{ taxableAmount: number; vatAmount: number; zeroRatedAmount: number; exemptAmount: number }>,
  purchases: Array<{ taxableAmount: number; vatAmount: number; exemptAmount: number }>
): VatReturnData {
  let taxableSales = 0, zeroRatedSales = 0, exemptSales = 0, outputVat = 0
  for (const s of sales) {
    taxableSales += s.taxableAmount
    zeroRatedSales += s.zeroRatedAmount
    exemptSales += s.exemptAmount
    outputVat += s.vatAmount
  }

  let taxablePurchases = 0, inputVat = 0
  for (const p of purchases) {
    taxablePurchases += p.taxableAmount
    inputVat += p.vatAmount
  }

  const netVatPayable = Math.max(0, outputVat - inputVat)
  const vatRefundable = Math.max(0, inputVat - outputVat)

  return {
    periodBs,
    taxableSales,
    zeroRatedSales,
    exemptSales,
    outputVat,
    taxablePurchases,
    inputVat,
    netVatPayable,
    vatRefundable,
    totalSales: taxableSales + zeroRatedSales + exemptSales,
    totalPurchases: taxablePurchases,
  }
}

// ============================================================
// Helpers — get all TDS sections (for dropdowns)
// ============================================================
export function getAllTdsSections(): Array<{ code: string; label: string; labelNp: string; rate: number }> {
  return Object.entries(DEFAULT_TDS_RATES).map(([code, def]) => ({
    code,
    label: def.label,
    labelNp: def.labelNp,
    rate: def.rate,
  }))
}

export function getDepreciationRate(category: string): number {
  return DEPRECIATION_RATES[category]?.rate ?? 15
}
