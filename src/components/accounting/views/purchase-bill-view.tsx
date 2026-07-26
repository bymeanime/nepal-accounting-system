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
import { Plus, Trash2, ShoppingCart, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { DEFAULT_TDS_RATES } from '@/lib/taxEngine'

interface Party { id: string; name: string; pan: string; type: string; tdsSection?: string | null }

export function PurchaseBillView() {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [bsDate, setBsDate] = useState(adToBsString(new Date()))
  const [partyId, setPartyId] = useState('')
  const [vendorPan, setVendorPan] = useState('')
  const [vendorBillNo, setVendorBillNo] = useState('')
  const [tdsSection, setTdsSection] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([
    { description: '', quantity: 1, unit: 'PCS', rate: 0, vatRate: 13, amount: 0, vatAmount: 0, total: 0, isExempt: false, isZeroRated: false },
  ])

  useEffect(() => {
    fetch('/api/parties?type=SUPPLIER')
      .then(r => r.json())
      .then(d => setParties(d.parties || []))
      .finally(() => setLoading(false))
  }, [])

  const selectParty = (id: string) => {
    setPartyId(id)
    const p = parties.find(p => p.id === id)
    if (p) {
      setVendorPan(p.pan || '')
      setTdsSection(p.tdsSection || '')
    }
  }

  const updateLine = (idx: number, field: string, value: any) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l
      const updated = { ...l, [field]: value }
      updated.amount = updated.quantity * updated.rate
      updated.vatAmount = updated.isExempt || updated.isZeroRated ? 0 : (updated.amount * updated.vatRate) / 100
      updated.total = updated.amount + updated.vatAmount
      return updated
    }))
  }

  const addLine = () => setLines([...lines, { description: '', quantity: 1, unit: 'PCS', rate: 0, vatRate: 13, amount: 0, vatAmount: 0, total: 0, isExempt: false, isZeroRated: false }])
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx))

  const totals = lines.reduce((acc, l) => ({
    taxable: acc.taxable + (l.isExempt || l.isZeroRated ? 0 : l.amount),
    exempt: acc.exempt + (l.isExempt ? l.amount : 0),
    vat: acc.vat + l.vatAmount,
    total: acc.total + l.total,
  }), { taxable: 0, exempt: 0, vat: 0, total: 0 })

  // Compute TDS based on selected section
  const tdsDef = tdsSection ? DEFAULT_TDS_RATES[tdsSection] : null
  const tdsRate = tdsDef?.rate ?? 0
  const tdsThreshold = tdsDef?.threshold ?? 0
  const tdsAmount = (tdsDef && totals.taxable > tdsThreshold) ? (totals.taxable * tdsRate) / 100 : 0
  const netPayable = totals.total - tdsAmount

  const handleSave = async () => {
    if (!partyId) { toast.error('Select a supplier'); return }
    if (!bsDate) { toast.error('Date is required'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/purchase-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bsDate, partyId, vendorPan, vendorBillNo, tdsSection, notes,
          lines: lines.map(l => ({
            description: l.description, quantity: l.quantity, unit: l.unit,
            rate: l.rate, vatRate: l.vatRate, amount: l.amount,
            isExempt: l.isExempt, isZeroRated: l.isZeroRated,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Purchase bill ${data.bill.billNo} saved — TDS ${formatNpr(data.bill.tdsAmount)}, Net payable ${formatNpr(data.bill.netPayable)}`)
      // Reset
      setLines([{ description: '', quantity: 1, unit: 'PCS', rate: 0, vatRate: 13, amount: 0, vatAmount: 0, total: 0, isExempt: false, isZeroRated: false }])
      setPartyId(''); setVendorPan(''); setVendorBillNo(''); setNotes('')
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
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            Record Purchase Bill
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Auto-captures input VAT + auto-deducts TDS per Section 88 of Income Tax Act
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Purchase Bill'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label className="text-xs">Bill Date (BS)</Label>
          <Input value={bsDate} onChange={e => setBsDate(e.target.value)} placeholder="2083-03-15" />
        </div>
        <div>
          <Label className="text-xs">Supplier</Label>
          <Select value={partyId} onValueChange={selectParty}>
            <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
            <SelectContent>
              {parties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}{p.pan && ` (${p.pan})`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Vendor PAN</Label>
          <Input value={vendorPan} onChange={e => setVendorPan(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Vendor Bill No</Label>
          <Input value={vendorBillNo} onChange={e => setVendorBillNo(e.target.value)} placeholder="Vendor's invoice no" />
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
                    <Input value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Item" className="h-8" />
                  </td>
                  <td className="py-2 pr-2">
                    <Input type="number" value={l.quantity} onChange={e => updateLine(i, 'quantity', Number(e.target.value))} className="h-8 w-16" />
                  </td>
                  <td className="py-2 pr-2">
                    <Input value={l.unit} onChange={e => updateLine(i, 'unit', e.target.value)} className="h-8 w-20" />
                  </td>
                  <td className="py-2 pr-2">
                    <Input type="number" value={l.rate} onChange={e => updateLine(i, 'rate', Number(e.target.value))} className="h-8 w-24" />
                  </td>
                  <td className="py-2 pr-2">
                    <Select value={String(l.vatRate)} onValueChange={v => updateLine(i, 'vatRate', Number(v))}>
                      <SelectTrigger className="h-8 w-16"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="13">13%</SelectItem>
                        <SelectItem value="0">0%</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2 text-right">{formatNpr(l.amount)}</td>
                  <td className="py-2 text-right text-emerald-600">{formatNpr(l.vatAmount)}</td>
                  <td className="py-2 text-right font-semibold">{formatNpr(l.total)}</td>
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
      </Card>

      {/* TDS Section */}
      <Card className="p-5 bg-amber-50/50 border-amber-200">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-600" />
          TDS Applicability (Section 88 — Income Tax Act)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">TDS Section</Label>
            <Select value={tdsSection} onValueChange={setTdsSection}>
              <SelectTrigger><SelectValue placeholder="Select TDS section" /></SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="">— None —</SelectItem>
                {Object.entries(DEFAULT_TDS_RATES).map(([code, def]) => (
                  <SelectItem key={code} value={code}>
                    {def.label} — {def.rate}%{def.threshold > 0 ? ` (> Rs ${def.threshold})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">TDS Rate</Label>
            <Input value={`${tdsRate}%`} disabled />
          </div>
          <div>
            <Label className="text-xs">TDS Amount</Label>
            <Input value={formatNpr(tdsAmount)} disabled className="font-bold text-amber-700" />
          </div>
        </div>
        {tdsDef && (
          <p className="text-xs text-slate-500 mt-2">
            {tdsDef.label} ({tdsDef.labelNp}) · Resident rate: {tdsDef.rate}%
            {tdsDef.threshold > 0 && ` · Threshold: Rs ${tdsDef.threshold}`}
          </p>
        )}
      </Card>

      {/* Totals summary */}
      <div className="flex justify-end">
        <div className="w-80 space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Taxable Amount</span>
            <span>{formatNprWithSymbol(totals.taxable)}</span>
          </div>
          {totals.exempt > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Exempt</span>
              <span>{formatNprWithSymbol(totals.exempt)}</span>
            </div>
          )}
          <div className="flex justify-between text-emerald-700">
            <span>+ Input VAT (claimable)</span>
            <span className="font-medium">{formatNprWithSymbol(totals.vat)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t border-slate-200 pt-1">
            <span>Gross Total</span>
            <span>{formatNprWithSymbol(totals.total)}</span>
          </div>
          {tdsAmount > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>− TDS Deducted ({tdsRate}%)</span>
              <span className="font-medium">{formatNprWithSymbol(tdsAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
            <span>Net Payable to Vendor</span>
            <span>{formatNprWithSymbol(netPayable)}</span>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
      </div>
    </div>
  )
}
