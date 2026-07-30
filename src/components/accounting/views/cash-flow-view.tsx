'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatNpr, formatNprWithSymbol } from '@/lib/format'
import { getFiscalYear, adToBsString } from '@/lib/nepaliCalendar'
import { Waves, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'

function Row({ label, amount, indent }: { label: string; amount: number; indent?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 px-3 ${indent ? 'pl-8' : ''}`}>
      <span className="text-slate-700">{label}</span>
      <span className={`font-medium ${amount < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
        {amount < 0 ? '(' : ''}{formatNpr(Math.abs(amount))}{amount < 0 ? ')' : ''}
      </span>
    </div>
  )
}

export function CashFlowView() {
  const fy = getFiscalYear(new Date())
  const [fromBs, setFromBs] = useState(fy.startBs)
  const [toBs, setToBs] = useState(adToBsString(new Date()))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch(`/api/cash-flow?fromBs=${fromBs}&toBs=${toBs}`)
      .then(r => r.json())
      .then(d => { if (active) { setData(d); setLoading(false) } })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [fromBs, toBs])

  if (loading) return <div className="p-8">Computing cash flow...</div>
  if (!data) return null

  const { openingCash, operating, investing, financing, netCashFlow, closingCash } = data

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Waves className="w-6 h-6 text-blue-600" />
            Cash Flow Statement
          </h1>
          <p className="text-sm text-slate-500 mt-1">NFRS 7 — Indirect Method · {data.period.fiscalYear} BS</p>
        </div>
        <div className="flex items-end gap-2">
          <div><Label className="text-xs">From (BS)</Label><Input value={fromBs} onChange={e => setFromBs(e.target.value)} className="w-32" /></div>
          <div><Label className="text-xs">To (BS)</Label><Input value={toBs} onChange={e => setToBs(e.target.value)} className="w-32" /></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <div className="flex items-center justify-between"><div><div className="text-xs text-slate-600">Opening Cash</div><div className="text-2xl font-bold text-slate-900">{formatNprWithSymbol(openingCash)}</div></div><PiggyBank className="w-8 h-8 text-blue-600" /></div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
          <div className="flex items-center justify-between"><div><div className="text-xs text-slate-600">Net Cash Flow</div><div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatNprWithSymbol(netCashFlow)}</div></div>{netCashFlow >= 0 ? <TrendingUp className="w-8 h-8 text-emerald-600" /> : <TrendingDown className="w-8 h-8 text-rose-600" />}</div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div><div className="text-xs opacity-70">Closing Cash</div><div className="text-2xl font-bold">{formatNprWithSymbol(closingCash)}</div></div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-2 pb-2 border-b border-slate-200 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" />Operating Activities</h3>
        <Row label="Net Profit" amount={operating.netProfit} />
        <Row label="Add: Depreciation (non-cash)" amount={operating.adjustments.depreciation} indent />
        <Row label="Less: Increase in Accounts Receivable" amount={operating.adjustments.accountsReceivableChange} indent />
        <Row label="Add: Increase in Accounts Payable" amount={operating.adjustments.accountsPayableChange} indent />
        <Row label="Less: Increase in Inventory" amount={operating.adjustments.inventoryChange} indent />
        <Row label="Add: Increase in Tax Liabilities" amount={operating.adjustments.taxLiabilityChange} indent />
        <div className="flex justify-between py-2 px-3 mt-2 border-t-2 border-slate-300 font-bold text-emerald-700">
          <span>Net Cash from Operating Activities</span><span>{formatNpr(operating.operatingCashFlow)}</span>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-2 pb-2 border-b border-slate-200 flex items-center gap-2"><Waves className="w-4 h-4 text-blue-600" />Investing Activities</h3>
        {investing.items.length === 0 ? <div className="text-center text-slate-400 text-sm py-4">No investing activities</div> :
          investing.items.map((item: any, i: number) => <Row key={i} label={item.name} amount={item.amount} indent />)}
        <div className="flex justify-between py-2 px-3 mt-2 border-t-2 border-slate-300 font-bold text-blue-700">
          <span>Net Cash from Investing Activities</span><span>{formatNpr(investing.investingCashFlow)}</span>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-2 pb-2 border-b border-slate-200 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-amber-600" />Financing Activities</h3>
        {financing.items.length === 0 ? <div className="text-center text-slate-400 text-sm py-4">No financing activities</div> :
          financing.items.map((item: any, i: number) => <Row key={i} label={item.name} amount={item.amount} indent />)}
        <div className="flex justify-between py-2 px-3 mt-2 border-t-2 border-slate-300 font-bold text-amber-700">
          <span>Net Cash from Financing Activities</span><span>{formatNpr(financing.financingCashFlow)}</span>
        </div>
      </Card>

      <Card className="p-5 bg-slate-900 text-white">
        <div className="space-y-2">
          <div className="flex justify-between"><span>Opening Cash Balance</span><span>{formatNpr(openingCash)}</span></div>
          <div className="flex justify-between"><span>Net Increase/(Decrease) in Cash</span><span>{formatNpr(netCashFlow)}</span></div>
          <div className="flex justify-between text-lg font-bold border-t border-white/30 pt-2"><span>Closing Cash Balance</span><span>{formatNpr(closingCash)}</span></div>
        </div>
      </Card>
    </div>
  )
}
