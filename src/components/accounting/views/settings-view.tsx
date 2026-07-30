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
import { Settings, Save, Building2, FileText, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

interface TenantSettings {
  id: string
  name: string
  legalName?: string | null
  pan?: string | null
  vatNumber?: string | null
  exciseNumber?: string | null
  ssfNumber?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  municipality?: string | null
  district?: string | null
  province?: string | null
  baseCurrency: string
  fyStartBsMonth: number
  language: string
  logoUrl?: string | null
}

export function SettingsView() {
  const [tenant, setTenant] = useState<TenantSettings | null>(null)
  const [fiscalYears, setFiscalYears] = useState<any[]>([])
  const [taxRulesInfo, setTaxRulesInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<TenantSettings>({
    id: '', name: '', legalName: '', pan: '', vatNumber: '',
    exciseNumber: '', ssfNumber: '', phone: '', email: '',
    address: '', municipality: '', district: '', province: 'Bagmati',
    baseCurrency: 'NPR', fyStartBsMonth: 4, language: 'en', logoUrl: '',
  })

  const load = () => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.tenant) {
          setTenant(d.tenant)
          setForm(d.tenant)
          setFiscalYears(d.fiscalYears || [])
          setTaxRulesInfo(d.taxRulesByType || null)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.name) { toast.error('Company name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(data.message || 'Settings updated')
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Toaster richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            Organization Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Edit company details, tax registration numbers, and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Company Identity */}
      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          Company Identity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label className="text-xs">Company Name *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Legal Name</Label>
            <Input value={form.legalName || ''} onChange={e => setForm({ ...form, legalName: e.target.value })} placeholder="Pvt. Ltd. / Ltd." />
          </div>
        </div>
      </Card>

      {/* Tax Registration */}
      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Tax Registration (IRD Nepal)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs">PAN Number</Label>
            <Input value={form.pan || ''} onChange={e => setForm({ ...form, pan: e.target.value })} placeholder="601234567" />
          </div>
          <div>
            <Label className="text-xs">VAT Number</Label>
            <Input value={form.vatNumber || ''} onChange={e => setForm({ ...form, vatNumber: e.target.value })} placeholder="Usually same as PAN" />
          </div>
          <div>
            <Label className="text-xs">Excise Number</Label>
            <Input value={form.exciseNumber || ''} onChange={e => setForm({ ...form, exciseNumber: e.target.value })} placeholder="If applicable" />
          </div>
          <div>
            <Label className="text-xs">SSF Number</Label>
            <Input value={form.ssfNumber || ''} onChange={e => setForm({ ...form, ssfNumber: e.target.value })} placeholder="Social Security Fund" />
          </div>
        </div>
      </Card>

      {/* Contact & Address */}
      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          Contact & Address
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+977-1-XXXXXXX" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@company.com.np" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Address</Label>
            <Input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
          </div>
          <div>
            <Label className="text-xs">Municipality</Label>
            <Input value={form.municipality || ''} onChange={e => setForm({ ...form, municipality: e.target.value })} placeholder="Kathmandu Metropolitan City" />
          </div>
          <div>
            <Label className="text-xs">District</Label>
            <Input value={form.district || ''} onChange={e => setForm({ ...form, district: e.target.value })} placeholder="Kathmandu" />
          </div>
          <div>
            <Label className="text-xs">Province</Label>
            <Select value={form.province || 'Bagmati'} onValueChange={v => setForm({ ...form, province: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Koshi">Koshi</SelectItem>
                <SelectItem value="Madhesh">Madhesh</SelectItem>
                <SelectItem value="Bagmati">Bagmati</SelectItem>
                <SelectItem value="Gandaki">Gandaki</SelectItem>
                <SelectItem value="Lumbini">Lumbini</SelectItem>
                <SelectItem value="Karnali">Karnali</SelectItem>
                <SelectItem value="Sudurpashchim">Sudurpashchim</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-600" />
          Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Base Currency</Label>
            <Select value={form.baseCurrency} onValueChange={v => setForm({ ...form, baseCurrency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NPR">NPR — Nepali Rupee</SelectItem>
                <SelectItem value="USD">USD — US Dollar</SelectItem>
                <SelectItem value="INR">INR — Indian Rupee</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
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
          <div>
            <Label className="text-xs">Fiscal Year Start Month</Label>
            <Select value={String(form.fyStartBsMonth)} onValueChange={v => setForm({ ...form, fyStartBsMonth: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4">Shrawan (Month 4) — Standard Nepal FY</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-400 mt-1">Nepal standard fiscal year starts Shrawan 1 (mid-July)</p>
          </div>
        </div>
      </Card>

      {/* Fiscal Years */}
      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          Fiscal Years
        </h3>
        <div className="space-y-2">
          {fiscalYears.map(fy => (
            <div key={fy.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-medium text-slate-900">FY {fy.label} BS</div>
                <div className="text-xs text-slate-500">BS Year {fy.bsYearStart} → {fy.bsYearEnd}</div>
              </div>
              <Badge variant={fy.status === 'OPEN' ? 'default' : 'secondary'} className="text-[10px]">
                {fy.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Tax Rules Summary */}
      {taxRulesInfo && (
        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Tax Rules Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{taxRulesInfo.VAT || 0}</div>
              <div className="text-xs text-slate-600">VAT Rules</div>
            </div>
            <div className="text-center p-3 bg-rose-50 rounded-lg">
              <div className="text-2xl font-bold text-rose-700">{taxRulesInfo.TDS || 0}</div>
              <div className="text-xs text-slate-600">TDS Sections</div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-700">{taxRulesInfo.SSF || 0}</div>
              <div className="text-xs text-slate-600">SSF Rules</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">{taxRulesInfo.INCOME_TAX || 0}</div>
              <div className="text-xs text-slate-600">Income Tax Rules</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Tax rules are configurable per Finance Act changes. Current rules are based on FY 2083/84 (2026/27).
          </p>
        </Card>
      )}
    </div>
  )
}
