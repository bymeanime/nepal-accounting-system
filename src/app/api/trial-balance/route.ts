// ============================================================
// API: Trial Balance (optimized — 2 queries instead of ~97)
// GET /api/trial-balance?asOfBs=2083-03-27
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'
import { bsStringToAd, isValidBsDate, adToBsString, getFiscalYear } from '@/lib/nepaliCalendar'
import { computeAccountBalances } from '@/lib/account-balances'

const DEMO_TENANT_ID = 'demo-tenant'

async function ensureSchema() {
  const ready = await isSchemaInitialized()
  if (!ready) await initializeSchema()
}

export async function GET(req: NextRequest) {
  try {
    await ensureSchema()
    const { searchParams } = new URL(req.url)
    const asOfBsParam = searchParams.get('asOfBs')
    const asOfBs = asOfBsParam && isValidBsDate(asOfBsParam) ? asOfBsParam : adToBsString(new Date())
    const asOfAd = bsStringToAd(asOfBs)
    const fy = getFiscalYear(new Date(asOfAd))

    // 2 queries total — was 97+ before
    const balances = await computeAccountBalances(DEMO_TENANT_ID, { to: asOfAd }, true)

    const lines: any[] = []
    let totalDebit = 0, totalCredit = 0

    for (const [, info] of balances) {
      if (info.isGroup) continue // skip group accounts in trial balance

      // Skip zero-balance accounts
      if (Math.abs(info.balance) < 0.01 && info.openingBalance === 0) continue

      let displayDebit = 0, displayCredit = 0
      if (info.balance >= 0) {
        displayDebit = info.balance
        totalDebit += info.balance
      } else {
        displayCredit = Math.abs(info.balance)
        totalCredit += Math.abs(info.balance)
      }

      lines.push({
        code: info.code,
        name: info.name,
        nameNp: info.nameNp,
        type: info.type,
        subType: info.subType,
        debit: displayDebit,
        credit: displayCredit,
      })
    }

    // Sort by code
    lines.sort((a, b) => a.code.localeCompare(b.code))

    return NextResponse.json({
      asOfBs,
      asOfAd: asOfAd.toISOString().split('T')[0],
      fiscalYear: fy.label,
      lines,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    })
  } catch (err: any) {
    console.error('[trial-balance] error:', err)
    return NextResponse.json({ error: 'Failed to compute trial balance', detail: err.message }, { status: 500 })
  }
}
