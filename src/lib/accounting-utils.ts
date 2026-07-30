// ============================================================
// Accounting utilities — shared across all API routes
// ============================================================

import { db } from '@/lib/db'

// Standard Nepal voucher number prefixes
export const VOUCHER_PREFIXES: Record<string, string> = {
  JOURNAL: 'JV',
  RECEIPT: 'RV',
  PAYMENT: 'PV',
  CONTRA: 'CV',
  SALES: 'SV',
  PURCHASE: 'BV',
}

/**
 * Generate a unique voucher number within a transaction.
 * Uses count-based numbering with the standard Nepal prefix.
 * Must be called inside a $transaction for race-safety.
 */
export async function generateVoucherNo(
  tx: any,
  tenantId: string,
  voucherType: string,
  datePart: string
): Promise<string> {
  const prefix = VOUCHER_PREFIXES[voucherType] || 'JV'
  const existing = await tx.voucher.count({
    where: { tenantId, voucherNo: { startsWith: `${prefix}-${datePart}` } },
  })
  return `${prefix}-${datePart}-${String(existing + 1).padStart(3, '0')}`
}

/**
 * Post a voucher with multiple lines.
 * Must be called inside a $transaction.
 */
export async function postVoucher(
  tx: any,
  params: {
    tenantId: string
    fiscalYearId?: string | null
    voucherType: string
    bsDate: string
    adDate: Date
    narration: string
    refType?: string
    refId?: string
    lines: Array<{ accountId: string; debit: number; credit: number; description?: string }>
  }
): Promise<string> {
  const datePart = params.bsDate.replace(/-/g, '')
  const voucherNo = await generateVoucherNo(tx, params.tenantId, params.voucherType, datePart)
  const totalDebit = params.lines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = params.lines.reduce((s, l) => s + l.credit, 0)

  await tx.voucher.create({
    data: {
      tenantId: params.tenantId,
      fiscalYearId: params.fiscalYearId,
      voucherNo,
      voucherType: params.voucherType,
      bsDate: params.bsDate,
      adDate: params.adDate,
      narration: params.narration,
      refType: params.refType,
      refId: params.refId,
      totalDebit,
      totalCredit,
      status: 'POSTED',
      lines: {
        create: params.lines.map(l => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        })),
      },
    },
  })

  return voucherNo
}

/**
 * Asset category to GL account code mapping (for capitalization)
 */
export const ASSET_CATEGORY_ACCOUNTS: Record<string, string> = {
  BUILDING_NON_FACTORY: '1102',
  BUILDING_FACTORY: '1102',
  BUILDING: '1102',
  PLANT_MACHINERY: '1103',
  VEHICLE: '1104',
  FURNITURE_FIXTURES: '1105',
  FURNITURE: '1105',
  IT_EQUIPMENT: '1106',
  INTANGIBLE_SOFTWARE: '1201',
  OFFICE_EQUIPMENT: '1103',
}
