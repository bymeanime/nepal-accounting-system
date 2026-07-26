'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatNpr, formatNprWithSymbol } from '@/lib/format'
import { adToBsString } from '@/lib/nepaliCalendar'
import { FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react'

export function TrialBalanceView() {
  const [asOfBs, setAsOfBs] = useState(adToBsString(new Date()))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch(`/api/trial-balance?asOfBs=${asOfBs}`)
      .then(r => r.json())
      .then(d => { if (active) setData(d) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [asOfBs])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            Trial Balance
          </h1>
          <p className="text-sm text-slate-500 mt-1">As of BS date · verifies debit = credit</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">As of (BS)</Label>
          <Input value={asOfBs} onChange={e => setAsOfBs(e.target.value)} className="w-32" />
        </div>
      </div>

      {loading && <div className="text-slate-500">Computing trial balance...</div>}

      {!loading && data && (
        <>
          <Card className={`p-4 ${data.isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {data.isBalanced ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                )}
                <div>
                  <div className="font-semibold text-slate-900">
                    {data.isBalanced ? 'Trial Balance is Balanced' : 'Trial Balance is Out of Balance'}
                  </div>
                  <div className="text-xs text-slate-600">
                    As of {data.asOfBs} BS · Fiscal Year {data.fiscalYear} · {data.lines.length} active accounts
                  </div>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-right">
                  <div className="text-xs text-slate-500">Total Debit</div>
                  <div className="font-bold text-slate-900">{formatNprWithSymbol(data.totalDebit)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Total Credit</div>
                  <div className="font-bold text-slate-900">{formatNprWithSymbol(data.totalCredit)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Difference</div>
                  <div className={`font-bold ${data.isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatNpr(Math.abs(data.totalDebit - data.totalCredit))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs text-slate-500">
                    <th className="px-4 py-2 font-medium">Code</th>
                    <th className="px-4 py-2 font-medium">Account</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium text-right">Debit</th>
                    <th className="px-4 py-2 font-medium text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line: any) => (
                    <tr key={line.code} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-1.5 font-mono text-xs">{line.code}</td>
                      <td className="px-4 py-1.5">
                        {line.name}
                        {line.nameNp && <span className="text-xs text-slate-500 ml-2">{line.nameNp}</span>}
                      </td>
                      <td className="px-4 py-1.5">
                        <Badge variant="outline" className="text-[10px]">{line.type}</Badge>
                      </td>
                      <td className="px-4 py-1.5 text-right font-medium">
                        {line.debit > 0 ? formatNpr(line.debit) : '—'}
                      </td>
                      <td className="px-4 py-1.5 text-right font-medium">
                        {line.credit > 0 ? formatNpr(line.credit) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right">Total</td>
                    <td className="px-4 py-2 text-right">{formatNpr(data.totalDebit)}</td>
                    <td className="px-4 py-2 text-right">{formatNpr(data.totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
