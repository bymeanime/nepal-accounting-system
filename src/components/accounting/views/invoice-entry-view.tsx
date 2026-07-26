'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatNpr, formatNprWithSymbol } from '@/lib/format'
import { adToBsString } from '@/lib/nepaliCalendar'
import { Plus, Trash2, Calculator, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

interface Party { id: string; name: string; pan: string; type: string }
interface InvoiceLine {
  description: string
  quantity: number
  unit: string
  rate: number
  vatRate: number
  isExempt: boolean
  isZeroRated: boolean
  amount: number
  vatAmount: number
  total: number
}

export function InvoiceEntryView({ onSaved }: { onSaved: () => void }) {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [bsDate, setBsDate] = useState(adToBsString(new Date()))
  const [partyId, setPartyId] = useState('')
  const [panBuyer, setPanBuyer] = useState('')
  const [invoiceType, setInvoiceType] = useState<'TAX_INVOICE' | 'ABBREVIATED' | 'EXPORT' | 'EXEMPT'>('TAX_INVOICE')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<InvoiceLine[]>([
    { description: '', quantity: 1, unit: 'PCS', rate: 0, vatRate: 13, isExempt: false, isZeroRated: false, amount: 0, vatAmount: 0, total: 0 },
  ])

  useEffect(() => {
    fetch('/api/parties?type=CUSTOMER')
      .then(r => r.json())
      .then(d => setParties(d.parties || []))
      .finally(() => setLoading(false))
  }, [])

  const selectParty = (id: string) => {
    setPartyId(id)
    const p = parties.find(p => p.id === id)
    if (p) setPanBuyer(p.pan || '')
  }

  const updateLine = (idx: number, field: keyof InvoiceLine, value: any) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l
      const updated = { ...l, [field]: value }
      // Recompute derived
      if (['quantity', 'rate', 'vatRate', 'isExempt', 'isZeroRated'].includes(field as string)) {
        updated.amount = updated.quantity * updated.rate
        updated.vatRate = updated.isExempt ? 0 : (invoiceType === 'EXPORT' || updated.isZeroRated) ? 0 : (invoiceType === 'EXEMPT' ? 0 : updated.vatRate)
        updated.vatAmount = updated.isExempt || updated.isZeroRated || invoiceType === 'EXPORT' || invoiceType === 'EXEMPT' ? 0 : (updated.amount * updated.vatRate) / 100
        updated.total = updated.amount + updated.vatAmount
      }
      return updated
    }))
  }

  // Recompute lines when invoiceType changes
  useEffect(() => {
    setLines(prev => prev.map(l => {
      const amount = l.quantity * l.rate
      const vatRate = (invoiceType === 'EXPORT' || invoiceType === 'EXEMPT') ? 0 : l.vatRate
      const vatAmount = vatRate === 0 ? 0 : (amount * vatRate) / 100
      return { ...l, amount, vatRate, vatAmount, total: amount + vatAmount }
    }))
  }, [invoiceType])

  const addLine = () => setLines([...lines, { description: '', quantity: 1, unit: 'PCS', rate: 0, vatRate: 13, isExempt: false, isZeroRated: false, amount: 0, vatAmount: 0, total: 0 }])
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx))

  const totals = lines.reduce((acc, l) => ({
    taxable: acc.taxable + (l.isExempt || l.isZeroRated || invoiceType === 'EXPORT' || invoiceType === 'EXEMPT' ? 0 : l.amount),
    exempt: acc.exempt + (invoiceType === 'EXEMPT' || l.isExempt ? l.amount : 0),
    zeroRated: acc.zeroRated + (invoiceType === 'EXPORT' || l.isZeroRated ? l.amount : 0),
    vat: acc.vat + l.vatAmount,
    total: acc.total + l.total,
  }), { taxable: 0, exempt: 0, zeroRated: 0, vat: 0, total: 0 })

  const handleSave = async () => {
    if (!partyId) { toast.error('Please select a customer'); return }
    if (!bsDate) { toast.error('Date is required'); return }
    if (lines.length === 0 || lines.every(l => l.amount === 0)) { toast.error('Add at least one line item'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bsDate,
          partyId,
          panBuyer,
          invoiceType,
          notes,
          lines: lines.map(l => ({
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            rate: l.rate,
            vatRate: l.vatRate,
            amount: l.amount,
            isExempt: l.isExempt,
            isZeroRated: l.isZeroRated,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Invoice ${data.invoice.invoiceNo} created — VAT ${formatNpr(data.invoice.vatAmount)}`)
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Toaster richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            New Sales Invoice
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            VAT-compliant tax invoice as per Nepal VAT Rule 17 · Auto-posts accounting voucher
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save & Post'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Invoice Date (BS)</Label>
          <Input value={bsDate} onChange={e => setBsDate(e.target.value)} placeholder="2083-03-15" />
          <p className="text-[10px] text-slate-400 mt-1">Format: YYYY-MM-DD (Bikram Sambat)</p>
        </div>
        <div>
          <Label className="text-xs">Invoice Type</Label>
          <Select value={invoiceType} onValueChange={(v: any) => setInvoiceType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TAX_INVOICE">Tax Invoice (13% VAT)</SelectItem>
              <SelectItem value="ABBREVIATED">Abbreviated (Retail ≤ Rs 5,000)</SelectItem>
              <SelectItem value="EXPORT">Export (0% VAT)</SelectItem>
              <SelectItem value="EXEMPT">Exempt Supply</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Customer</Label>
          <Select value={partyId} onValueChange={selectParty}>
            <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>
              {parties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}{p.pan && ` (${p.pan})`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Line Items</h3>
          <Button size="sm" variant="outline" onClick={addLine}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="pb-2 font-medium w-1/3">Description</th>
                <th className="pb-2 font-medium">Qty</th>
                <th className="pb-2 font-medium">Unit</th>
                <th className="pb-2 font-medium">Rate (Rs)</th>
                <th className="pb-2 font-medium">VAT%</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium text-right">VAT</th>
                <th className="pb-2 font-medium text-right">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-2 pr-2">
                    <Input
                      value={l.description}
                      onChange={e => updateLine(i, 'description', e.target.value)}
                      placeholder="Item description"
                      className="h-8"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      value={l.quantity}
                      onChange={e => updateLine(i, 'quantity', Number(e.target.value))}
                      className="h-8 w-16"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      value={l.unit}
                      onChange={e => updateLine(i, 'unit', e.target.value)}
                      className="h-8 w-20"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      value={l.rate}
                      onChange={e => updateLine(i, 'rate', Number(e.target.value))}
                      className="h-8 w-24"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Select value={String(l.vatRate)} onValueChange={v => updateLine(i, 'vatRate', Number(v))}>
                      <SelectTrigger className="h-8 w-16"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="13">13%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="0">0%</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2 text-right text-slate-700">{formatNpr(l.amount)}</td>
                  <td className="py-2 text-right text-blue-600">{formatNpr(l.vatAmount)}</td>
                  <td className="py-2 text-right font-semibold text-slate-900">{formatNpr(l.total)}</td>
                  <td className="py-2 pl-2">
                    {lines.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => removeLine(i)} className="h-7 w-7">
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Amount</span>
              <span className="font-medium">{formatNprWithSymbol(totals.taxable)}</span>
            </div>
            {totals.zeroRated > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Zero-Rated (Export)</span>
                <span className="font-medium">{formatNprWithSymbol(totals.zeroRated)}</span>
              </div>
            )}
            {totals.exempt > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Exempt</span>
                <span className="font-medium">{formatNprWithSymbol(totals.exempt)}</span>
              </div>
            )}
            <div className="flex justify-between text-blue-700">
              <span>VAT (Output VAT)</span>
              <span className="font-semibold">{formatNprWithSymbol(totals.vat)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
              <span className="font-bold text-slate-900">Total</span>
              <span className="font-bold text-slate-900">{formatNprWithSymbol(totals.total)}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Buyer PAN (for tax invoice)</Label>
          <Input value={panBuyer} onChange={e => setPanBuyer(e.target.value)} placeholder="Customer PAN number" />
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" rows={2} />
        </div>
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Calculator className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 space-y-1">
            <div className="font-semibold text-slate-900">Auto-Posting Preview</div>
            <div>When you save, the system will create:</div>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Sales invoice record with QR data (buyer PAN, VAT amount, total)</li>
              <li>Accounting voucher: <span className="font-mono">Dr. Accounts Receivable</span> · <span className="font-mono">Cr. Sales + Output VAT</span></li>
              <li>Tax ledger entries — these flow into the monthly VAT Return (V48)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
