'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatNpr, formatNprWithSymbol } from '@/lib/format'
import { adToBsString } from '@/lib/nepaliCalendar'
import { Scale, CheckCircle2, AlertTriangle, FileDown } from 'lucide-react'

interface AccountItem {
  code: string
  name: string
  nameNp?: string | null
  balance: number
}

function AccountRow({ account }: { account: AccountItem }) {
  return (
    <div className="flex justify-between py-1.5 px-3 hover:bg-slate-50">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-slate-400">{account.code}</span>
        <span className="text-slate-900">{account.name}</span>
        {account.nameNp && <span className="text-xs text-slate-500">{account.nameNp}</span>}
      </div>
      <span className="font-medium">{formatNpr(account.balance)}</span>
    </div>
  )
}

function Section({ title, items, total }: { title: string; items: AccountItem[]; total: number }) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-slate-900 mb-2 pb-2 border-b border-slate-200">{title}</h3>
      {items.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-4">No accounts with balance</div>
      ) : (
        <div className="space-y-0">{items.map(a => <AccountRow key={a.code} account={a} />)}</div>
      )}
      <div className="mt-2 pt-2 border-t-2 border-slate-300 flex justify-between font-bold text-slate-900">
        <span>Total</span>
        <span>{formatNpr(total)}</span>
      </div>
    </Card>
  )
}

export function BalanceSheetView() {
  const [asOfBs, setAsOfBs] = useState(adToBsString(new Date()))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch(`/api/balance-sheet?asOfBs=${asOfBs}`)
      .then(r => r.json())
      .then(d => { if (active) { setData(d); setLoading(false) } })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [asOfBs])

  if (loading) return <div className="p-8">Computing Balance Sheet...</div>
  if (!data) return null

  const { assets, liabilities, equity, summary } = data

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-blue-600" />
            Balance Sheet (Statement of Financial Position)
          </h1>
          <p className="text-sm text-slate-500 mt-1">As of {data.asOfBs} BS · NFRS-compliant format</p>
        </div>
        <div className="flex items-center gap-2">
          <div>
            <Label className="text-xs">As of (BS)</Label>
            <Input value={asOfBs} onChange={e => setAsOfBs(e.target.value)} className="w-32" />
          </div>
          <Button variant="outline" asChild>
            <a href={`/api/export/balance-sheet?asOfBs=${asOfBs}`} target="_blank" rel="noreferrer">
              <FileDown className="w-4 h-4 mr-2" />Excel
            </a>
          </Button>
        </div>
      </div>

      <Card className={`p-4 ${summary.isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {summary.isBalanced ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            )}
            <div>
              <div className="font-semibold text-slate-900">
                {summary.isBalanced ? 'Balance Sheet is Balanced' : 'Adjusting for current-period profit/loss'}
              </div>
              <div className="text-xs text-slate-600">
                Assets = Liabilities + Equity (including retained earnings adjustment for net profit)
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Difference</div>
            <div className={`font-bold ${summary.isBalanced ? 'text-emerald-700' : 'text-amber-700'}`}>
              {formatNpr(Math.abs(summary.totalAssets - summary.totalLiabilitiesAndEquity))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 rounded-t-lg">
            <div className="font-bold">ASSETS</div>
            <div className="text-xs opacity-80">सम्पत्ति</div>
          </div>
          <Section title="Current Assets (चालू सम्पत्ति)" items={assets.current.accounts} total={assets.current.total} />
          <Section title="Fixed Assets (स्थिर सम्पत्ति)" items={assets.fixed.accounts} total={assets.fixed.total} />
          <Section title="Non-Current Assets (गैर-चालू सम्पत्ति)" items={assets.nonCurrent.accounts} total={assets.nonCurrent.total} />
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex justify-between text-lg font-bold text-slate-900">
              <span>TOTAL ASSETS</span>
              <span>{formatNprWithSymbol(assets.total)}</span>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-3 rounded-t-lg">
            <div className="font-bold">LIABILITIES & EQUITY</div>
            <div className="text-xs opacity-80">दायित्व र पुँजी</div>
          </div>
          <Section title="Current Liabilities (चालू दायित्व)" items={liabilities.current.accounts} total={liabilities.current.total} />
          <Section title="Long-Term Liabilities (दीर्घकालीन दायित्व)" items={liabilities.longTerm.accounts} total={liabilities.longTerm.total} />
          <Card className="p-4 bg-rose-50 border-rose-200">
            <div className="flex justify-between font-bold text-slate-900">
              <span>Total Liabilities</span>
              <span>{formatNprWithSymbol(liabilities.total)}</span>
            </div>
          </Card>
          <Section title="Equity / Capital (पुँजी)" items={equity.accounts} total={equity.total} />
          {equity.retainedEarningsAdjustment !== 0 && (
            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex justify-between text-sm">
                <div>
                  <div className="font-medium text-slate-900">Current Period P&L (Retained Earnings adj.)</div>
                  <div className="text-xs text-slate-500">Auto-calculated from vouchers</div>
                </div>
                <span className={`font-bold ${equity.retainedEarningsAdjustment >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatNprWithSymbol(equity.retainedEarningsAdjustment)}
                </span>
              </div>
            </Card>
          )}
          <Card className="p-4 bg-rose-50 border-rose-200">
            <div className="flex justify-between text-lg font-bold text-slate-900">
              <span>TOTAL LIABILITIES & EQUITY</span>
              <span>{formatNprWithSymbol(summary.totalLiabilitiesAndEquity)}</span>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs opacity-70">Total Assets</div>
            <div className="text-xl font-bold">{formatNprWithSymbol(summary.totalAssets)}</div>
          </div>
          <div>
            <div className="text-xs opacity-70">Total Liabilities</div>
            <div className="text-xl font-bold">{formatNprWithSymbol(summary.totalLiabilities)}</div>
          </div>
          <div>
            <div className="text-xs opacity-70">Total Equity (incl. retained earnings)</div>
            <div className="text-xl font-bold">{formatNprWithSymbol(summary.totalEquity)}</div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/20 text-center text-xs opacity-80">
          As per NFRS 1 (Presentation of Financial Statements) · Schedule V Nepal Companies Act format
        </div>
      </Card>
    </div>
  )
}
