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
import { formatNpr, formatNprWithSymbol } from '@/lib/format'
import { Package, Plus, X, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { useI18n } from '@/components/accounting/i18n-provider'

interface Item {
  id: string
  sku: string
  name: string
  nameNp?: string | null
  type: string
  unit: string
  valuationMethod: string
  salePrice: number
  purchasePrice: number
  vatRate: number
  vatExempt: boolean
  hsnCode?: string | null
  reorderLevel: number
  stockQuantity: number
  stockValue: number
}

export function ItemsView() {
  const { t } = useI18n()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    sku: '', name: '', nameNp: '', type: 'GOODS', unit: 'PCS',
    valuationMethod: 'WEIGHTED_AVG', salePrice: 0, purchasePrice: 0,
    vatRate: 13, vatExempt: false, hsnCode: '', reorderLevel: 0,
    openingStock: 0, openingValue: 0,
  })

  const load = () => {
    fetch('/api/items')
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.sku || !form.name) { toast.error('SKU and Name required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Item "${form.name}" created`)
      setShowForm(false)
      setForm({ sku: '', name: '', nameNp: '', type: 'GOODS', unit: 'PCS', valuationMethod: 'WEIGHTED_AVG', salePrice: 0, purchasePrice: 0, vatRate: 13, vatExempt: false, hsnCode: '', reorderLevel: 0, openingStock: 0, openingValue: 0 })
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const totalStockValue = items.reduce((s, i) => s + i.stockValue, 0)
  const lowStockItems = items.filter(i => i.stockQuantity <= i.reorderLevel && i.reorderLevel > 0)

  if (loading) return <div className="p-8">{t('loading')}</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Toaster richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            {t('items')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Items, products, services with inventory tracking · FIFO / Weighted Average valuation
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="w-4 h-4 mr-2" />{t('cancel')}</> : <><Plus className="w-4 h-4 mr-2" />{t('add')}</>}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-500">Total Items</div>
          <div className="text-xl font-bold text-slate-900">{items.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Total Stock Value</div>
          <div className="text-xl font-bold text-emerald-700">{formatNprWithSymbol(totalStockValue)}</div>
        </Card>
        <Card className={`p-4 ${lowStockItems.length > 0 ? 'bg-amber-50 border-amber-200' : ''}`}>
          <div className="text-xs text-slate-500">Low Stock Alerts</div>
          <div className="text-xl font-bold text-amber-700">{lowStockItems.length}</div>
        </Card>
      </div>

      {showForm && (
        <Card className="p-5 space-y-4 border-2 border-blue-200">
          <h3 className="font-semibold">New Item</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">SKU *</Label>
              <Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Item Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Name (Nepali)</Label>
              <Input value={form.nameNp} onChange={e => setForm({ ...form, nameNp: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOODS">Goods (Trading)</SelectItem>
                  <SelectItem value="SERVICE">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Unit</Label>
              <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PCS">PCS</SelectItem>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="LTR">LTR</SelectItem>
                  <SelectItem value="BOX">BOX</SelectItem>
                  <SelectItem value="MTR">MTR</SelectItem>
                  <SelectItem value="SET">SET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Valuation Method</Label>
              <Select value={form.valuationMethod} onValueChange={v => setForm({ ...form, valuationMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEIGHTED_AVG">Weighted Average</SelectItem>
                  <SelectItem value="FIFO">FIFO (First In, First Out)</SelectItem>
                  <SelectItem value="SPECIFIC">Specific Identification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Sale Price (Rs)</Label>
              <Input type="number" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Purchase Price (Rs)</Label>
              <Input type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">VAT Rate</Label>
              <Select value={String(form.vatRate)} onValueChange={v => setForm({ ...form, vatRate: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="13">13%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="0">0% (Exempt)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">HSN Code</Label>
              <Input value={form.hsnCode} onChange={e => setForm({ ...form, hsnCode: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Reorder Level</Label>
              <Input type="number" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Opening Stock</Label>
              <Input type="number" value={form.openingStock} onChange={e => setForm({ ...form, openingStock: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Opening Value (Rs)</Label>
              <Input type="number" value={form.openingValue} onChange={e => setForm({ ...form, openingValue: Number(e.target.value) })} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Item'}</Button>
        </Card>
      )}

      {lowStockItems.length > 0 && (
        <Card className="p-3 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-sm text-amber-900">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Low Stock Alert:</span>
            <span>{lowStockItems.map(i => `${i.name} (${i.stockQuantity} ${i.unit})`).join(', ')}</span>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">SKU</th>
                <th className="px-4 py-2 font-medium">Item Name</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="px-4 py-2 font-medium text-right">Sale Price</th>
                <th className="px-4 py-2 font-medium text-right">Purchase Price</th>
                <th className="px-4 py-2 font-medium">VAT</th>
                <th className="px-4 py-2 font-medium text-right">Stock</th>
                <th className="px-4 py-2 font-medium text-right">Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">No items yet. Add your first item.</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-mono text-xs">{item.sku}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {item.name}
                    {item.nameNp && <span className="text-xs text-slate-500 ml-2">{item.nameNp}</span>}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={item.type === 'GOODS' ? 'default' : 'secondary'} className="text-[10px]">{item.type}</Badge>
                  </td>
                  <td className="px-4 py-2">{item.unit}</td>
                  <td className="px-4 py-2 text-right">{formatNpr(item.salePrice)}</td>
                  <td className="px-4 py-2 text-right">{formatNpr(item.purchasePrice)}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="text-[10px]">{item.vatExempt ? 'Exempt' : `${item.vatRate}%`}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    <span className={item.reorderLevel > 0 && item.stockQuantity <= item.reorderLevel ? 'text-amber-700 font-bold' : ''}>
                      {item.stockQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{formatNpr(item.stockValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
