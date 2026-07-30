'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatNpr } from '@/lib/format'
import { adToBsString } from '@/lib/nepaliCalendar'
import { PackageSearch, ArrowUp, ArrowDown, Settings, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

interface Item { id: string; sku: string; name: string; unit: string }
interface Movement {
  id: string
  itemId: string
  item: Item
  type: string
  quantity: number
  rate: number
  value: number
  bsDate: string
  notes?: string | null
  refType?: string | null
}

export function StockMovementsView() {
  const [items, setItems] = useState<Item[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    itemId: '',
    type: 'IN',
    quantity: 1,
    rate: 0,
    bsDate: adToBsString(new Date()),
    notes: '',
  })

  const load = () => {
    Promise.all([
      fetch('/api/items').then(r => r.json()),
      fetch('/api/stock-movements?limit=100').then(r => r.json()),
    ])
      .then(([itemsData, movData]) => {
        setItems(itemsData.items || [])
        setMovements(movData.movements || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.itemId) { toast.error('Select an item'); return }
    if (form.quantity <= 0) { toast.error('Quantity must be positive'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Stock ${form.type} recorded for ${data.movement.item.name}`)
      setShowForm(false)
      setForm({ itemId: '', type: 'IN', quantity: 1, rate: 0, bsDate: adToBsString(new Date()), notes: '' })
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  const totalIn = movements.filter(m => m.type === 'IN' || m.type === 'OPENING').reduce((s, m) => s + m.quantity, 0)
  const totalOut = movements.filter(m => m.type === 'OUT').reduce((s, m) => s + Math.abs(m.quantity), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Toaster richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <PackageSearch className="w-6 h-6 text-blue-600" />
            Stock Movements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track goods in/out/adjustments · auto-valuation via FIFO or Weighted Average
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="w-4 h-4 mr-2" />Cancel</> : <><Plus className="w-4 h-4 mr-2" />New Movement</>}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-500">Total IN (Stock received)</div>
          <div className="text-xl font-bold text-emerald-700">{totalIn.toLocaleString('en-IN')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Total OUT (Stock issued)</div>
          <div className="text-xl font-bold text-rose-700">{totalOut.toLocaleString('en-IN')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Total Movements</div>
          <div className="text-xl font-bold text-slate-900">{movements.length}</div>
        </Card>
      </div>

      {showForm && (
        <Card className="p-5 space-y-4 border-2 border-blue-200">
          <h3 className="font-semibold">New Stock Movement</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs">Item</Label>
              <Select value={form.itemId} onValueChange={v => setForm({ ...form, itemId: v })}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {items.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.sku} — {i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Movement Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">IN (Receive Stock)</SelectItem>
                  <SelectItem value="OUT">OUT (Issue Stock)</SelectItem>
                  <SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
                  <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Quantity</Label>
              <Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Rate (Rs)</Label>
              <Input type="number" value={form.rate} onChange={e => setForm({ ...form, rate: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">BS Date</Label>
              <Input value={form.bsDate} onChange={e => setForm({ ...form, bsDate: e.target.value })} placeholder="2083-03-15" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
          </div>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Record Movement'}</Button>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">BS Date</th>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium text-right">Quantity</th>
                <th className="px-4 py-2 font-medium text-right">Rate</th>
                <th className="px-4 py-2 font-medium text-right">Value</th>
                <th className="px-4 py-2 font-medium">Reference</th>
                <th className="px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">No stock movements recorded yet</td></tr>
              ) : movements.map(m => (
                <tr key={m.id} className="border-b border-slate-50">
                  <td className="px-4 py-2">{m.bsDate}</td>
                  <td className="px-4 py-2 font-medium">
                    {m.item.name}
                    <span className="text-xs text-slate-500 ml-2">({m.item.sku})</span>
                  </td>
                  <td className="px-4 py-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        m.type === 'IN' || m.type === 'OPENING' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        m.type === 'OUT' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {m.type === 'IN' && <ArrowUp className="w-3 h-3 mr-1 inline" />}
                      {m.type === 'OUT' && <ArrowDown className="w-3 h-3 mr-1 inline" />}
                      {m.type === 'ADJUSTMENT' && <Settings className="w-3 h-3 mr-1 inline" />}
                      {m.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </td>
                  <td className="px-4 py-2 text-right">{formatNpr(m.rate)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatNpr(m.value)}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{m.refType || '—'}</td>
                  <td className="px-4 py-2 text-xs text-slate-500 max-w-xs truncate">{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
