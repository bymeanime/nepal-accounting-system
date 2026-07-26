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
import { Users, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { DEFAULT_TDS_RATES } from '@/lib/taxEngine'

interface Party {
  id: string; name: string; nameNp?: string; type: string; pan?: string;
  phone?: string; email?: string; address?: string; district?: string;
  tdsSection?: string | null; openingBalance: number;
}

export function PartiesView() {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL')

  const [form, setForm] = useState({
    name: '', nameNp: '', type: 'CUSTOMER', pan: '', vatNumber: '',
    phone: '', email: '', address: '', district: '', tdsSection: '',
    creditLimit: 0, openingBalance: 0,
  })

  const load = () => {
    fetch('/api/parties')
      .then(r => r.json())
      .then(d => setParties(d.parties || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.name || !form.type) { toast.error('Name and type required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Party "${form.name}" created`)
      setShowForm(false)
      setForm({ name: '', nameNp: '', type: 'CUSTOMER', pan: '', vatNumber: '', phone: '', email: '', address: '', district: '', tdsSection: '', creditLimit: 0, openingBalance: 0 })
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = parties.filter(p => filter === 'ALL' || p.type === filter)

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Toaster richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Customers & Suppliers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage party master with PAN, TDS section mapping, credit terms
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="w-4 h-4 mr-2" />Cancel</> : <><Plus className="w-4 h-4 mr-2" />Add Party</>}
        </Button>
      </div>

      <div className="flex gap-2">
        {(['ALL', 'CUSTOMER', 'SUPPLIER'] as const).map(t => (
          <Button
            key={t}
            size="sm"
            variant={filter === t ? 'default' : 'outline'}
            onClick={() => setFilter(t)}
          >
            {t === 'ALL' ? 'All' : t === 'CUSTOMER' ? 'Customers' : 'Suppliers'}
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {t === 'ALL' ? parties.length : parties.filter(p => p.type === t).length}
            </Badge>
          </Button>
        ))}
      </div>

      {showForm && (
        <Card className="p-5 space-y-4 border-2 border-blue-200">
          <h3 className="font-semibold">New Party</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs">Name (Nepali)</Label>
              <Input value={form.nameNp} onChange={e => setForm({...form, nameNp: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs">Type *</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="SUPPLIER">Supplier</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">PAN</Label>
              <Input value={form.pan} onChange={e => setForm({...form, pan: e.target.value})} placeholder="PAN number" />
            </div>
            <div>
              <Label className="text-xs">VAT Number</Label>
              <Input value={form.vatNumber} onChange={e => setForm({...form, vatNumber: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs">District</Label>
              <Input value={form.district} onChange={e => setForm({...form, district: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Address</Label>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs">TDS Section (suppliers)</Label>
              <Select value={form.tdsSection} onValueChange={v => setForm({...form, tdsSection: v})}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="">— None —</SelectItem>
                  {Object.entries(DEFAULT_TDS_RATES).map(([code, def]) => (
                    <SelectItem key={code} value={code}>{def.label} ({def.rate}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Opening Balance (Rs)</Label>
              <Input type="number" value={form.openingBalance} onChange={e => setForm({...form, openingBalance: Number(e.target.value)})} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Party'}</Button>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">PAN</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Address</th>
                <th className="px-4 py-2 font-medium">TDS Section</th>
                <th className="px-4 py-2 font-medium text-right">Opening Bal</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No parties found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {p.name}
                    {p.nameNp && <span className="text-xs text-slate-500 ml-2">{p.nameNp}</span>}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={p.type === 'CUSTOMER' ? 'default' : p.type === 'SUPPLIER' ? 'secondary' : 'outline'} className="text-[10px]">
                      {p.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{p.pan || '—'}</td>
                  <td className="px-4 py-2">{p.phone || '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{p.address || '—'}{p.district && `, ${p.district}`}</td>
                  <td className="px-4 py-2">
                    {p.tdsSection ? <Badge variant="outline" className="text-[10px]">{p.tdsSection}</Badge> : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">{Number(p.openingBalance).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
