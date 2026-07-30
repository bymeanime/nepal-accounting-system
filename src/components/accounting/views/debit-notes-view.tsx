'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatNpr } from '@/lib/format'
import { adToBsString } from '@/lib/nepaliCalendar'
import { ShoppingCart, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

export function DebitNotesView() {
  const [bills, setBills] = useState<any[]>([])
  const [debitNotes, setDebitNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ originalBillId: '', bsDate: adToBsString(new Date()), reason: '', lineDescription: '', lineQty: 1, lineRate: 0, lineVatRate: 13 })

  const load = () => {
    Promise.all([
      fetch('/api/purchase-bills?limit=50').then(r => r.json()),
      fetch('/api/debit-notes').then(r => r.json()),
    ]).then(([bData, dnData]) => {
      setBills(bData.bills || [])
      setDebitNotes(dnData.debitNotes || [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.originalBillId) { toast.error('Select original bill'); return }
    const amount = Number(form.lineQty) * Number(form.lineRate)
    setSaving(true)
    try {
      const res = await fetch('/api/debit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalBillId: form.originalBillId,
          bsDate: form.bsDate,
          reason: form.reason,
          lines: [{ description: form.lineDescription, quantity: Number(form.lineQty), rate: Number(form.lineRate), vatRate: Number(form.lineVatRate), amount }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message)
      setShowForm(false)
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Toaster richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-amber-600" />Debit Notes (Purchase Returns)</h1>
          <p className="text-sm text-slate-500 mt-1">Process purchase returns — reverses bill, removes goods from inventory</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? <><X className="w-4 h-4 mr-2" />Cancel</> : <><Plus className="w-4 h-4 mr-2" />New Debit Note</>}</Button>
      </div>

      {showForm && (
        <Card className="p-5 space-y-4 border-2 border-amber-200">
          <h3 className="font-semibold">New Debit Note</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label className="text-xs">Original Bill *</Label><Select value={form.originalBillId} onValueChange={v => setForm({ ...form, originalBillId: v })}><SelectTrigger><SelectValue placeholder="Select bill" /></SelectTrigger><SelectContent>{bills.filter(b => b.status === 'UNPAID' || b.status === 'PAID').map(b => <SelectItem key={b.id} value={b.id}>{b.billNo} — {b.party?.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Return Date (BS)</Label><Input value={form.bsDate} onChange={e => setForm({ ...form, bsDate: e.target.value })} /></div>
            <div><Label className="text-xs">Reason</Label><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Defective goods, wrong delivery, etc." /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2"><Label className="text-xs">Item Description</Label><Input value={form.lineDescription} onChange={e => setForm({ ...form, lineDescription: e.target.value })} /></div>
            <div><Label className="text-xs">Qty</Label><Input type="number" value={form.lineQty} onChange={e => setForm({ ...form, lineQty: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Rate (Rs)</Label><Input type="number" value={form.lineRate} onChange={e => setForm({ ...form, lineRate: Number(e.target.value) })} /></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-600">Return total: <span className="font-bold text-amber-700">Rs {formatNpr(Number(form.lineQty) * Number(form.lineRate) * 1.13)}</span> (incl 13% VAT)</div>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create Debit Note'}</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Debit Note No</th><th className="px-4 py-2 font-medium">BS Date</th><th className="px-4 py-2 font-medium">Narration</th><th className="px-4 py-2 font-medium text-right">Amount</th><th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {debitNotes.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-slate-400">No debit notes yet</td></tr> :
                debitNotes.map(dn => (
                  <tr key={dn.id} className="border-b border-slate-50">
                    <td className="px-4 py-2 font-mono text-xs">{dn.voucherNo}</td>
                    <td className="px-4 py-2">{dn.bsDate}</td>
                    <td className="px-4 py-2 text-slate-700 max-w-md truncate">{dn.narration}</td>
                    <td className="px-4 py-2 text-right font-semibold text-amber-700">{formatNpr(Number(dn.totalDebit))}</td>
                    <td className="px-4 py-2"><Badge variant="default" className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-100">{dn.status}</Badge></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
