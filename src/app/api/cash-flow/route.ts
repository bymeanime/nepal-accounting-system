// ============================================================
// API: Cash Flow Statement (NFRS 7 — indirect method)
// GET /api/cash-flow?fromBs=2082-04-01&toBs=2083-03-32
// Computes: Operating + Investing + Financing cash flows
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'
import { bsStringToAd, isValidBsDate, getFiscalYear } from '@/lib/nepaliCalendar'
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
    const fy = getFiscalYear(new Date())
    const fromBs = searchParams.get('fromBs') && isValidBsDate(searchParams.get('fromBs')!) ? searchParams.get('fromBs')! : fy.startBs
    const toBs = searchParams.get('toBs') && isValidBsDate(searchParams.get('toBs')!) ? searchParams.get('toBs')! : fy.endBs
    const fromAd = bsStringToAd(fromBs)
    const toAd = bsStringToAd(toBs)

    // Get all account balances for the period (movements only, no opening)
    const balances = await computeAccountBalances(DEMO_TENANT_ID, { from: fromAd, to: toAd }, false)

    // Opening cash balance (up to fromAd)
    const openingBalances = await computeAccountBalances(DEMO_TENANT_ID, { to: fromAd }, true)
    let openingCash = 0
    for (const [, info] of openingBalances) {
      if (info.isCash || info.isBank) openingCash += info.balance
    }

    // === INDIRECT METHOD ===
    // Start with net profit, adjust for non-cash items and working capital changes

    // 1. Net profit (income - expense for the period)
    let netProfit = 0
    for (const [, info] of balances) {
      if (info.isGroup) continue
      if (info.type === 'INCOME') netProfit += Math.abs(info.balance)
      if (info.type === 'EXPENSE') netProfit -= Math.abs(info.balance)
    }

    // 2. Add back depreciation (non-cash expense)
    let depreciation = 0
    for (const [, info] of balances) {
      if (info.code === '5114') depreciation += Math.abs(info.balance) // Depreciation account
    }

    // 3. Working capital changes
    // AR change: increase = cash outflow (negative), decrease = inflow (positive)
    let arChange = 0
    for (const [, info] of balances) {
      if (info.code === '1010') arChange = -info.balance // AR increase = negative cash flow
    }

    // AP change: increase = cash inflow (positive), decrease = outflow (negative)
    let apChange = 0
    for (const [, info] of balances) {
      if (info.code === '2001') apChange = info.balance // AP increase = positive cash flow
    }

    // Inventory change: increase = cash outflow (negative)
    let inventoryChange = 0
    for (const [, info] of balances) {
      if (info.code === '1052') inventoryChange = -info.balance
    }

    // VAT/TDS/SSF changes (operating)
    let taxLiabilityChange = 0
    for (const [, info] of balances) {
      if (['2003', '2004', '2005', '2007'].includes(info.code)) {
        taxLiabilityChange += info.balance // increase = inflow
      }
    }

    // Operating cash flow
    const operatingCashFlow = netProfit + depreciation + arChange + apChange + inventoryChange + taxLiabilityChange

    // 4. Investing activities (fixed asset purchases/sales)
    let investingCashFlow = 0
    const investingItems: any[] = []
    for (const [, info] of balances) {
      if (info.type === 'ASSET' && info.subType === 'FIXED_ASSET' && Math.abs(info.balance) > 0.01) {
        // Fixed asset debit increase = cash outflow (negative)
        const flow = -info.balance
        investingCashFlow += flow
        investingItems.push({ code: info.code, name: info.name, amount: flow })
      }
    }

    // 5. Financing activities (loans, equity, dividends)
    let financingCashFlow = 0
    const financingItems: any[] = []
    for (const [, info] of balances) {
      if (info.type === 'LIABILITY' && info.subType === 'LONG_TERM_LIABILITY' && Math.abs(info.balance) > 0.01) {
        // Loan increase = cash inflow (positive)
        const flow = info.balance
        financingCashFlow += flow
        financingItems.push({ code: info.code, name: info.name, amount: flow })
      }
      if (info.type === 'EQUITY' && Math.abs(info.balance) > 0.01) {
        // Equity increase = cash inflow
        const flow = info.balance
        financingCashFlow += flow
        financingItems.push({ code: info.code, name: info.name, amount: flow })
      }
    }

    // 6. Cash and bank movement (direct verification)
    let cashMovement = 0
    for (const [, info] of balances) {
      if (info.isCash || info.isBank) cashMovement += info.balance
    }

    const closingCash = openingCash + cashMovement
    const indirectClosing = openingCash + operatingCashFlow + investingCashFlow + financingCashFlow

    return NextResponse.json({
      period: { fromBs, toBs, fiscalYear: fy.label },
      openingCash,
      operating: {
        netProfit,
        adjustments: {
          depreciation,
          accountsReceivableChange: arChange,
          accountsPayableChange: apChange,
          inventoryChange,
          taxLiabilityChange,
        },
        operatingCashFlow,
      },
      investing: {
        items: investingItems,
        investingCashFlow,
      },
      financing: {
        items: financingItems,
        financingCashFlow,
      },
      netCashFlow: operatingCashFlow + investingCashFlow + financingCashFlow,
      closingCash,
      verification: {
        directCashMovement: cashMovement,
        indirectCashMovement: operatingCashFlow + investingCashFlow + financingCashFlow,
        difference: cashMovement - (operatingCashFlow + investingCashFlow + financingCashFlow),
      },
    })
  } catch (err: any) {
    console.error('[cash-flow] error:', err)
    return NextResponse.json({ error: 'Failed to compute cash flow', detail: err.message }, { status: 500 })
  }
}
