'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatNpr, formatNprWithSymbol } from '@/lib/format'
import { getFiscalYear, adToBsString } from '@/lib/nepaliCalendar'
import { FileText, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'

interface AccountLine {
  code: string
  name: string
  nameNp?: string | null
  subType?: string | null
  balance: number
}

function AccountRow({ account }: { account: AccountLine }) {
  return (
    <div className="flex justify-between py-1.5 px-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-slate-400">{account.code}</span>
        <span className="text-slate-900">{account.name}</span>
        {account.nameNp && <span className="text-xs text-slate-500">{account.nameNp}</span>}
      </div>
      <span className="font-medium">{formatNpr(account.balance)}</span>
    </div>
  )
}

function Section({ title, items, total, totalLabel }: { title: string; items: AccountLine[]; total: number; totalLabel: string }) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-slate-900 mb-2 pb-2 border-b border-slate-200">{title}</h3>
      <div className="space-y-0">
        {items.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-4">No transactions</div>
        ) : items.map(item => (
          <AccountRow key={item.code} account={item} />
        ))}
      </div>
      <div className="mt-2 pt-2 border-t-2 border-slate-300 flex justify-between font-bold text-slate-900">
        <span>{totalLabel}</span>
        <span>{formatNpr(total)}</span>
      </div>
    </Card>
  )
}

export function ProfitLossView() {
  const fy = getFiscalYear(new Date())
  const [fromBs, setFromBs] = useState(fy.startBs)
  const [toBs, setToBs] = useState(adToBsString(new Date()))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch(`/api/profit-loss?fromBs=${fromBs}&toBs=${toBs}`)
      .then(r => r.json())
      .then(d => { if (active) { setData(d); setLoading(false) } })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [fromBs, toBs])

  if (loading) return <div className="p-8">Computing P&L...</div>
  if (!data) return null

  const { income, expenses, summary, period } = data

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Profit & Loss Statement
          </h1>
          <p className="text-sm text-slate-500 mt-1">NFRS-compliant · {period.fiscalYear} BS fiscal year</p>
        </div>
        <div className="flex items-center gap-2">
          <div>
            <Label className="text-xs">From (BS)</Label>
            <Input value={fromBs} onChange={e => setFromBs(e.target.value)} className="w-32" />
          </div>
          <div>
            <Label className="text-xs">To (BS)</Label>
            <Input value={toBs} onChange={e => setToBs(e.target.value)} className="w-32" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-600">Total Revenue</div>
              <div className="text-2xl font-bold text-slate-900">{formatNprWithSymbol(income.totalRevenue)}</div>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-600" />
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-rose-50 to-white border-rose-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-600">Total Expenses</div>
              <div className="text-2xl font-bold text-slate-900">{formatNprWithSymbol(expenses.totalExpenses)}</div>
            </div>
            <TrendingDown className="w-8 h-8 text-rose-600" />
          </div>
        </Card>
        <Card className={`p-5 bg-gradient-to-br ${summary.netProfitAfterTax >= 0 ? 'from-blue-50 to-white border-blue-200' : 'from-rose-100 to-white border-rose-300'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-600">Net Profit (after tax)</div>
              <div className={`text-2xl font-bold ${summary.netProfitAfterTax >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                {formatNprWithSymbol(summary.netProfitAfterTax)}
              </div>
            </div>
            <PiggyBank className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Operating Income" items={income.operating} total={income.totalOperating} totalLabel="Total Operating Income" />
        <Section title="Cost of Goods Sold" items={expenses.cogs} total={expenses.totalCogs} totalLabel="Total COGS" />
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex justify-between items-center">
          <div className="font-semibold text-slate-900">Gross Profit</div>
          <div className="text-xl font-bold text-blue-700">{formatNprWithSymbol(summary.grossProfit)}</div>
        </div>
        <div className="text-xs text-slate-500 mt-1">Operating Income − Cost of Goods Sold</div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Administrative Expenses" items={expenses.admin} total={expenses.totalAdmin} totalLabel="Total Admin" />
        <Section title="Selling & Distribution" items={expenses.selling} total={expenses.totalSelling} totalLabel="Total Selling" />
        <Section title="Financial Expenses" items={expenses.financial} total={expenses.totalFinancial} totalLabel="Total Financial" />
        <Section title="Tax Expenses" items={expenses.tax} total={expenses.totalTax} totalLabel="Total Tax" />
      </div>

      <Section title="Non-Operating Income" items={income.nonOperating} total={income.totalNonOperating} totalLabel="Total Non-Operating" />

      <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Gross Profit</span>
            <span className="font-medium">{formatNpr(summary.grossProfit)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Less: Operating Expenses (Admin + Selling + Financial)</span>
            <span className="font-medium">({formatNpr(expenses.totalAdmin + expenses.totalSelling + expenses.totalFinancial)})</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Add: Non-Operating Income</span>
            <span className="font-medium">{formatNpr(income.totalNonOperating)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-slate-600 pt-2">
            <span>Net Profit Before Tax</span>
            <span className="font-bold">{formatNpr(summary.netProfitBeforeTax)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Less: Tax Expense</span>
            <span className="font-medium">({formatNpr(expenses.totalTax)})</span>
          </div>
          <div className="flex justify-between text-lg border-t-2 border-white/30 pt-2">
            <span className="font-bold">Net Profit After Tax</span>
            <span className="font-bold">{formatNprWithSymbol(summary.netProfitAfterTax)}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
