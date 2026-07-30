// ============================================================
// Account balance batch computation utility
// Replaces N+1 query pattern with 2 queries total
// ============================================================

import { db } from '@/lib/db'

export interface AccountBalanceInfo {
  accountId: string
  code: string
  name: string
  nameNp: string | null
  type: string
  subType: string | null
  isGroup: boolean
  isCash: boolean
  isBank: boolean
  openingBalance: number
  debit: number       // total debits from posted vouchers
  credit: number      // total credits from posted vouchers
  balance: number     // opening + debit - credit
}

/**
 * Compute balances for ALL accounts of a tenant in 2 queries.
 * Optional date range filter for P&L (within period) or Balance Sheet (up to date).
 *
 * @param tenantId
 * @param dateFilter — optional { from?: Date, to?: Date } to filter voucher lines by adDate
 * @param includeOpening — if true, include opening balance (for Balance Sheet / Trial Balance);
 *                         if false, only movement within period (for P&L)
 */
export async function computeAccountBalances(
  tenantId: string,
  dateFilter?: { from?: Date; to?: Date },
  includeOpening: boolean = true,
): Promise<Map<string, AccountBalanceInfo>> {
  // Query 1: Get all accounts
  const accounts = await db.account.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true, code: true, name: true, nameNp: true, type: true, subType: true,
      isGroup: true, isCash: true, isBank: true, openingBalance: true,
    },
  })

  // Query 2: Sum all voucher lines grouped by accountId
  const whereClause: any = {
    voucher: { tenantId, status: 'POSTED' },
  }
  if (dateFilter?.from || dateFilter?.to) {
    whereClause.voucher.adDate = {}
    if (dateFilter.from) whereClause.voucher.adDate.gte = dateFilter.from
    if (dateFilter.to) whereClause.voucher.adDate.lte = dateFilter.to
  }

  const balances = await db.voucherLine.groupBy({
    by: ['accountId'],
    where: whereClause,
    _sum: { debit: true, credit: true },
  })

  // Build result map
  const balanceMap = new Map<string, number>()
  for (const b of balances) {
    balanceMap.set(b.accountId, {
      debit: Number(b._sum.debit || 0),
      credit: Number(b._sum.credit || 0),
    } as any)
  }

  const result = new Map<string, AccountBalanceInfo>()
  for (const acc of accounts) {
    const movement = balanceMap.get(acc.id) as any || { debit: 0, credit: 0 }
    const opening = includeOpening ? Number(acc.openingBalance) : 0
    const balance = opening + Number(movement.debit) - Number(movement.credit)
    result.set(acc.id, {
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      nameNp: acc.nameNp,
      type: acc.type,
      subType: acc.subType,
      isGroup: acc.isGroup,
      isCash: acc.isCash,
      isBank: acc.isBank,
      openingBalance: opening,
      debit: Number(movement.debit),
      credit: Number(movement.credit),
      balance,
    })
  }

  return result
}

/**
 * Helper: get balance by account code from a balance map
 */
export function getBalanceByCode(balances: Map<string, AccountBalanceInfo>, code: string): AccountBalanceInfo | null {
  for (const [, info] of balances) {
    if (info.code === code) return info
  }
  return null
}

/**
 * Helper: sum balances for accounts matching a filter
 */
export function sumBalances(
  balances: Map<string, AccountBalanceInfo>,
  filter: (info: AccountBalanceInfo) => boolean,
): number {
  let total = 0
  for (const [, info] of balances) {
    if (filter(info)) total += info.balance
  }
  return total
}
