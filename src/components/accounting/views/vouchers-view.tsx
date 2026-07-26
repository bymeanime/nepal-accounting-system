'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatNpr, formatNprWithSymbol } from '@/lib/format'
import { adToBsString } from '@/lib/nepaliCalendar'
import { BookOpen, Plus, Trash2, CheckCircle2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

interface FlatAccount { id: string; code: string; name: string; type: string; isGroup: boolean }

interface Line {
  accountCode: string
  debit: number
  credit: number
  description: string
}

export function VouchersView() {
  const [vouchers, setVouchers] = useState<any[]>([])
  const [accounts, setAccounts] = useState<FlatAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [bsDate, setBsDate] = useState(adToBsString(new Date()))
  const [voucherType, setVoucherType] = useState('JOURNAL')
  const [narration, setNarration] = useState('')
  const [lines, setLines] = useState<Line[]>([
    { accountCode: '', debit: 0, credit: 0, description: '' },
    { accountCode: '', debit: 0, credit: 0, description: '' },
  ])

  const loadVouchers = () => {
    fetch('/api/vouchers?limit=100')
      .then(r => r.json())
      .then(d => setVouchers(d.vouchers || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadVouchers()
    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => setAccounts((d.flat || []).filter((a: FlatAccount) => !a.isGroup)))
  }, [])

  const updateLine = (idx: number, field: keyof Line, value: any) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  const addLine = () => setLines([...lines, { accountCode: '', debit: 0, credit: 0, description: '' }])
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx))

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0

  const handleSave = async () => {
    if (!bsDate) { toast.error('Date required'); return }
    if (!narration) { toast.error('Narration required'); return }
    if (lines.length < 2) { toast.error('Min 2 lines required'); return }
    if (lines.some(l => !l.accountCode)) { toast.error('All lines must have an account'); return }
    if (!isBalanced) { toast.error(`Debit (${totalDebit}) must equal Credit (${totalCredit})`); return }

    setSaving(true)
    try {
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherType, bsDate, narration, lines }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Voucher ${data.voucher.voucherNo} posted`)
      setShowForm(false)
      setNarration('')
      setLines([
        { accountCode: '', debit: 0, credit: 0, description: '' },
        { accountCode: '', debit: 0, credit: 0, description: '' },
      ])
      loadVouchers()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Toaster richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Journal Vouchers
          </h1>
          <p className="text-sm text-slate-500 mt-1">Double-entry accounting vouchers · auto-posted to general ledger</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="w-4 h-4 mr-2" />Cancel</> : <><Plus className="w-4 h-4 mr-2" />New Voucher</>}
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 space-y-4 border-2 border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Voucher Date (BS)</Label>
              <Input value={bsDate} onChange={e => setBsDate(e.target.value)} placeholder="2083-03-15" />
            </div>
            <div>
              <Label className="text-xs">Voucher Type</Label>
              <Select value={voucherType} onValueChange={setVoucherType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="JOURNAL">Journal</SelectItem>
                  <SelectItem value="RECEIPT">Receipt</SelectItem>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                  <SelectItem value="CONTRA">Contra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Narration</Label>
              <Input value={narration} onChange={e => setNarration(e.target.value)} placeholder="What is this voucher for?" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Voucher Lines</Label>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-3.5 h-3.5 mr-1" />Add Line</Button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 font-medium px-2">
                <div className="col-span-5">Account</div>
                <div className="col-span-3">Debit (Rs)</div>
                <div className="col-span-3">Credit (Rs)</div>
                <div className="col-span-1"></div>
              </div>
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Select value={l.accountCode} onValueChange={v => updateLine(i, 'accountCode', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent className="max-h-80">
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={a.code}>
                            <span className="font-mono text-xs">{a.code}</span> — {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      value={l.debit || ''}
                      onChange={e => updateLine(i, 'debit', Number(e.target.value))}
                      className="h-9 text-right"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      value={l.credit || ''}
                      onChange={e => updateLine(i, 'credit', Number(e.target.value))}
                      className="h-9 text-right"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-1">
                    {lines.length > 2 && (
                      <Button size="icon" variant="ghost" onClick={() => removeLine(i)} className="h-9 w-9">
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <div className={`flex items-center gap-2 text-sm ${isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isBalanced ? (
                <><CheckCircle2 className="w-4 h-4" />Balanced</>
              ) : (
                <>Out of balance by {formatNpr(Math.abs(totalDebit - totalCredit))}</>
              )}
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>Total Debit: <span className="font-semibold">{formatNprWithSymbol(totalDebit)}</span></div>
              <div>Total Credit: <span className="font-semibold">{formatNprWithSymbol(totalCredit)}</span></div>
              <Button onClick={handleSave} disabled={saving || !isBalanced}>
                {saving ? 'Posting...' : 'Post Voucher'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Voucher No</th>
                <th className="px-4 py-2 font-medium">BS Date</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Narration</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Lines</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No vouchers posted yet</td></tr>
              ) : vouchers.map(v => (
                <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-mono text-xs">{v.voucherNo}</td>
                  <td className="px-4 py-2">{v.bsDate}</td>
                  <td className="px-4 py-2"><Badge variant="outline" className="text-[10px]">{v.voucherType}</Badge></td>
                  <td className="px-4 py-2 max-w-md truncate text-slate-700">{v.narration}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatNpr(Number(v.totalDebit))}</td>
                  <td className="px-4 py-2">
                    <Badge variant="default" className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{v.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{v.lines.length} lines</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
