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
import { adToBsString } from '@/lib/nepaliCalendar'
import { Boxes, Plus, X, Calculator, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { DEPRECIATION_RATES } from '@/lib/taxEngine'

interface FixedAsset {
  id: string
  assetCode: string
  name: string
  category: string
  acquisitionBsDate: string
  cost: number
  salvageValue: number
  usefulLifeYears: number
  depMethod: string
  depRate: number
  accumulatedDep: number
  computedDepreciation: number
  fyDepreciation: number
  bookValue: number
  yearsElapsed: number
  status: string
}

export function FixedAssetsView() {
  const [assets, setAssets] = useState<FixedAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [postingDep, setPostingDep] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    assetCode: '',
    name: '',
    category: 'PLANT_MACHINERY',
    acquisitionBsDate: adToBsString(new Date()),
    cost: 0,
    salvageValue: 0,
    usefulLifeYears: 5,
    depMethod: 'WDV',
    depRate: 15,
    location: '',
  })

  const load = () => {
    fetch('/api/fixed-assets')
      .then(r => r.json())
      .then(d => setAssets(d.assets || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.assetCode || !form.name || !form.cost) {
      toast.error('Asset Code, Name, and Cost required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/fixed-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Fixed asset "${form.name}" created`)
      setShowForm(false)
      setForm({ assetCode: '', name: '', category: 'PLANT_MACHINERY', acquisitionBsDate: adToBsString(new Date()), cost: 0, salvageValue: 0, usefulLifeYears: 5, depMethod: 'WDV', depRate: 15, location: '' })
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePostDepreciation = async () => {
    if (!confirm('Post depreciation voucher for current fiscal year? This will create a journal entry debiting Depreciation Expense and crediting Accumulated Depreciation.')) return
    setPostingDep(true)
    try {
      const res = await fetch('/api/depreciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (data.posted) {
        toast.success(`Depreciation posted: ${data.voucherNo} · Rs ${data.totalDepreciation} · ${data.assetsProcessed} assets`)
      } else {
        toast.info(data.message || 'No depreciation to post')
      }
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setPostingDep(false)
    }
  }

  const totalCost = assets.reduce((s, a) => s + a.cost, 0)
  const totalDep = assets.reduce((s, a) => s + a.computedDepreciation, 0)
  const totalBookValue = assets.reduce((s, a) => s + a.bookValue, 0)
  const totalFyDep = assets.reduce((s, a) => s + a.fyDepreciation, 0)

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Toaster richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-600" />
            Fixed Assets Register
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Per Income Tax Act depreciation rates · WDV or SLM · auto-post depreciation to ledger
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePostDepreciation} disabled={postingDep}>
            <Play className="w-4 h-4 mr-2" />
            {postingDep ? 'Posting...' : 'Post FY Depreciation'}
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X className="w-4 h-4 mr-2" />Cancel</> : <><Plus className="w-4 h-4 mr-2" />Add Asset</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-500">Total Assets Cost</div>
          <div className="text-xl font-bold text-slate-900">{formatNprWithSymbol(totalCost)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Accumulated Depreciation</div>
          <div className="text-xl font-bold text-rose-700">{formatNprWithSymbol(totalDep)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Net Book Value</div>
          <div className="text-xl font-bold text-emerald-700">{formatNprWithSymbol(totalBookValue)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">FY Depreciation (est.)</div>
          <div className="text-xl font-bold text-amber-700">{formatNprWithSymbol(totalFyDep)}</div>
        </Card>
      </div>

      {showForm && (
        <Card className="p-5 space-y-4 border-2 border-blue-200">
          <h3 className="font-semibold">New Fixed Asset</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Asset Code *</Label>
              <Input value={form.assetCode} onChange={e => setForm({ ...form, assetCode: e.target.value })} placeholder="FA-001" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Asset Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Delivery Van" />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => {
                const def = DEPRECIATION_RATES[v]
                setForm({ ...form, category: v, depRate: def?.rate ?? form.depRate, depMethod: def?.method ?? form.depMethod })
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEPRECIATION_RATES).map(([code, def]) => (
                    <SelectItem key={code} value={code}>{def.label} ({def.rate}% {def.method})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Acquisition Date (BS)</Label>
              <Input value={form.acquisitionBsDate} onChange={e => setForm({ ...form, acquisitionBsDate: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Cost (Rs) *</Label>
              <Input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Salvage Value (Rs)</Label>
              <Input type="number" value={form.salvageValue} onChange={e => setForm({ ...form, salvageValue: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Useful Life (years)</Label>
              <Input type="number" value={form.usefulLifeYears} onChange={e => setForm({ ...form, usefulLifeYears: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Depreciation Method</Label>
              <Select value={form.depMethod} onValueChange={v => setForm({ ...form, depMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WDV">WDV (Written Down Value)</SelectItem>
                  <SelectItem value="SLM">SLM (Straight Line)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Depreciation Rate (%)</Label>
              <Input type="number" value={form.depRate} onChange={e => setForm({ ...form, depRate: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Asset'}</Button>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Asset Code</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Acquired (BS)</th>
                <th className="px-4 py-2 font-medium text-right">Cost</th>
                <th className="px-4 py-2 font-medium">Method</th>
                <th className="px-4 py-2 font-medium text-right">Rate</th>
                <th className="px-4 py-2 font-medium text-right">Years Elapsed</th>
                <th className="px-4 py-2 font-medium text-right">Accum. Dep</th>
                <th className="px-4 py-2 font-medium text-right">FY Dep</th>
                <th className="px-4 py-2 font-medium text-right">Book Value</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-slate-400">No fixed assets registered. Add your first asset to start tracking depreciation.</td></tr>
              ) : assets.map(a => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-mono text-xs">{a.assetCode}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">{a.name}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="text-[10px]">{a.category.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-4 py-2">{a.acquisitionBsDate}</td>
                  <td className="px-4 py-2 text-right">{formatNpr(a.cost)}</td>
                  <td className="px-4 py-2">
                    <Badge variant={a.depMethod === 'WDV' ? 'default' : 'secondary'} className="text-[10px]">{a.depMethod}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right">{a.depRate}%</td>
                  <td className="px-4 py-2 text-right text-slate-600">{a.yearsElapsed}</td>
                  <td className="px-4 py-2 text-right text-rose-700">{formatNpr(a.computedDepreciation)}</td>
                  <td className="px-4 py-2 text-right text-amber-700">{formatNpr(a.fyDepreciation)}</td>
                  <td className="px-4 py-2 text-right font-bold text-emerald-700">{formatNpr(a.bookValue)}</td>
                </tr>
              ))}
            </tbody>
            {assets.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right">Total</td>
                  <td className="px-4 py-2 text-right">{formatNpr(totalCost)}</td>
                  <td colSpan={3}></td>
                  <td className="px-4 py-2 text-right text-rose-700">{formatNpr(totalDep)}</td>
                  <td className="px-4 py-2 text-right text-amber-700">{formatNpr(totalFyDep)}</td>
                  <td className="px-4 py-2 text-right text-emerald-700">{formatNpr(totalBookValue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Calculator className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 space-y-1">
            <div className="font-semibold text-slate-900">Income Tax Act — Depreciation Rates</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {Object.entries(DEPRECIATION_RATES).map(([code, def]) => (
                <div key={code} className="bg-white px-2 py-1 rounded border border-slate-200">
                  <div className="font-medium">{def.label}</div>
                  <div className="text-[10px] text-slate-500">{def.rate}% · {def.method}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-blue-200">
              Click <strong>Post FY Depreciation</strong> to auto-create a journal voucher debiting Depreciation Expense (5114) and crediting Accumulated Depreciation (1107) for all active assets.
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
