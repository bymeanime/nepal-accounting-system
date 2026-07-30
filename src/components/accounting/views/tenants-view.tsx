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
import { Building2, Plus, X, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

interface Tenant {
  id: string
  name: string
  legalName?: string | null
  pan?: string | null
  vatNumber?: string | null
  address?: string | null
  district?: string | null
  province?: string | null
  baseCurrency: string
  language: string
  stats: {
    vouchers: number
    invoices: number
    parties: number
    accounts: number
  }
}

export function TenantsView() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [activeTenantId, setActiveTenantId] = useState('demo-tenant')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    name: '', legalName: '', pan: '', vatNumber: '',
    address: '', municipality: '', district: '', province: 'Bagmati',
    phone: '', email: '', baseCurrency: 'NPR', language: 'en',
  })

  const load = () => {
    fetch('/api/tenants')
      .then(r => r.json())
      .then(d => {
        setTenants(d.tenants || [])
        setActiveTenantId(d.activeTenantId || 'demo-tenant')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.name || !form.pan) { toast.error('Name and PAN required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Tenant "${form.name}" created with default chart of accounts`)
      setShowForm(false)
      setForm({ name: '', legalName: '', pan: '', vatNumber: '', address: '', municipality: '', district: '', province: 'Bagmati', phone: '', email: '', baseCurrency: 'NPR', language: 'en' })
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSwitch = (id: string) => {
    // In a production app, this would set a session/cookie
    // For demo, we just inform the user
    toast.info(`In production, this would switch the active tenant to "${tenants.find(t => t.id === id)?.name}". Multi-tenant APIs are ready.`)
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Toaster richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Companies (Tenants)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage multiple companies from one account · ideal for chartered accountants serving multiple clients
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="w-4 h-4 mr-2" />Cancel</> : <><Plus className="w-4 h-4 mr-2" />Add Company</>}
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 space-y-4 border-2 border-blue-200">
          <h3 className="font-semibold">New Company</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Company Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Legal Name</Label>
              <Input value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} placeholder="Pvt. Ltd. / Ltd." />
            </div>
            <div>
              <Label className="text-xs">PAN *</Label>
              <Input value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">VAT Number</Label>
              <Input value={form.vatNumber} onChange={e => setForm({ ...form, vatNumber: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Address</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Municipality</Label>
              <Input value={form.municipality} onChange={e => setForm({ ...form, municipality: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">District</Label>
              <Input value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Province</Label>
              <Select value={form.province} onValueChange={v => setForm({ ...form, province: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bagmati">Bagmati</SelectItem>
                  <SelectItem value="Gandaki">Gandaki</SelectItem>
                  <SelectItem value="Lumbini">Lumbini</SelectItem>
                  <SelectItem value="Karnali">Karnali</SelectItem>
                  <SelectItem value="Sudurpashchim">Sudurpashchim</SelectItem>
                  <SelectItem value="Koshi">Koshi</SelectItem>
                  <SelectItem value="Madhesh">Madhesh</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Base Currency</Label>
              <Select value={form.baseCurrency} onValueChange={v => setForm({ ...form, baseCurrency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NPR">NPR — Nepali Rupee</SelectItem>
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                  <SelectItem value="INR">INR — Indian Rupee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Language</Label>
              <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ne">नेपाली (Nepali)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save & Auto-Setup COA'}</Button>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tenants.map(t => (
          <Card key={t.id} className={`p-5 ${t.id === activeTenantId ? 'border-2 border-blue-300 bg-blue-50/30' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900">{t.name}</h3>
                  {t.id === activeTenantId && (
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      <CheckCircle2 className="w-3 h-3 mr-1" />Active
                    </Badge>
                  )}
                </div>
                {t.legalName && <div className="text-xs text-slate-500">{t.legalName}</div>}
              </div>
              <Button
                size="sm"
                variant={t.id === activeTenantId ? 'outline' : 'default'}
                onClick={() => handleSwitch(t.id)}
                disabled={t.id === activeTenantId}
              >
                {t.id === activeTenantId ? 'Current' : 'Switch'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-[10px] text-slate-500">PAN</div>
                <div className="font-medium">{t.pan || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">VAT</div>
                <div className="font-medium">{t.vatNumber || '—'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] text-slate-500">Address</div>
                <div className="text-slate-700">{t.address || '—'}{t.district && `, ${t.district}`}{t.province && `, ${t.province}`}</div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <div className="text-base font-bold text-slate-900">{t.stats.vouchers}</div>
                <div className="text-[10px] text-slate-500">Vouchers</div>
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">{t.stats.invoices}</div>
                <div className="text-[10px] text-slate-500">Invoices</div>
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">{t.stats.parties}</div>
                <div className="text-[10px] text-slate-500">Parties</div>
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">{t.stats.accounts}</div>
                <div className="text-[10px] text-slate-500">Accounts</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="text-xs text-slate-700 space-y-1">
          <div className="font-semibold text-slate-900">Multi-Tenant Architecture</div>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Each tenant = one company with its own chart of accounts, vouchers, invoices, parties, tax rules</li>
            <li>Designed for chartered accountants and accounting firms serving multiple Nepali clients</li>
            <li>Production-ready: enable NextAuth.js + Postgres Row-Level Security (RLS) for true isolation</li>
            <li>All APIs scoped by <code>tenantId</code> — currently defaulted to demo-tenant for the showcase</li>
            <li>Adding a new company auto-creates the standard Nepal chart of accounts (Schedule V) and current fiscal year</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
