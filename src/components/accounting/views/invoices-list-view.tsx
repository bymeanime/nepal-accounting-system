'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatNpr, formatNprWithSymbol } from '@/lib/format'
import { FileText, Search } from 'lucide-react'

export function InvoicesListView() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/invoices?limit=100')
      .then(r => r.json())
      .then(d => setInvoices(d.invoices || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = invoices.filter(inv =>
    !search ||
    inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
    inv.party?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalTaxable = filtered.reduce((s, i) => s + Number(i.taxableAmount), 0)
  const totalVat = filtered.reduce((s, i) => s + Number(i.vatAmount), 0)
  const totalAmount = filtered.reduce((s, i) => s + Number(i.totalAmount), 0)

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Sales Invoices
        </h1>
        <p className="text-sm text-slate-500 mt-1">All sales invoices (VAT-compliant) for current tenant</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-500">Total Taxable Sales</div>
          <div className="text-xl font-bold text-slate-900">{formatNprWithSymbol(totalTaxable)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Total Output VAT</div>
          <div className="text-xl font-bold text-blue-700">{formatNprWithSymbol(totalVat)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Total Invoice Value</div>
          <div className="text-xl font-bold text-slate-900">{formatNprWithSymbol(totalAmount)}</div>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by invoice no or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Invoice No</th>
                <th className="px-4 py-2 font-medium">BS Date</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">PAN</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium text-right">Taxable</th>
                <th className="px-4 py-2 font-medium text-right">VAT</th>
                <th className="px-4 py-2 font-medium text-right">Total</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">No invoices found</td></tr>
              ) : filtered.map(inv => (
                <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-mono text-xs">{inv.invoiceNo}</td>
                  <td className="px-4 py-2 text-slate-600">{inv.bsDate}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">{inv.party?.name}</td>
                  <td className="px-4 py-2 text-slate-600">{inv.party?.pan || inv.panBuyer || '—'}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="text-[10px]">{inv.invoiceType}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right">{formatNpr(Number(inv.taxableAmount))}</td>
                  <td className="px-4 py-2 text-right text-blue-700 font-medium">{formatNpr(Number(inv.vatAmount))}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatNpr(Number(inv.totalAmount))}</td>
                  <td className="px-4 py-2">
                    <Badge variant={inv.status === 'PAID' ? 'default' : 'secondary'} className="text-[10px]">
                      {inv.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
