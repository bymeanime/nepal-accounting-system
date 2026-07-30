'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { History } from 'lucide-react'

export function AuditLogView() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')

  const load = () => {
    const url = filter === 'ALL' ? '/api/audit-log?limit=200' : `/api/audit-log?entityType=${filter}&limit=200`
    fetch(url).then(r => r.json()).then(d => setLogs(d.logs || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [filter])

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><History className="w-6 h-6 text-blue-600" />Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">Every mutation is logged per Nepal ITA §24 (7-year retention)</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Activities</SelectItem>
            <SelectItem value="INVOICE">Invoices</SelectItem>
            <SelectItem value="PURCHASE_BILL">Purchase Bills</SelectItem>
            <SelectItem value="VOUCHER">Vouchers</SelectItem>
            <SelectItem value="CREDIT_NOTE">Credit Notes</SelectItem>
            <SelectItem value="DEBIT_NOTE">Debit Notes</SelectItem>
            <SelectItem value="PARTY">Parties</SelectItem>
            <SelectItem value="ITEM">Items</SelectItem>
            <SelectItem value="TENANT">Tenants</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr className="text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Timestamp</th><th className="px-4 py-2 font-medium">Action</th><th className="px-4 py-2 font-medium">Entity Type</th><th className="px-4 py-2 font-medium">Entity ID</th><th className="px-4 py-2 font-medium">User</th><th className="px-4 py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">No audit entries yet</td></tr> :
                logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-xs text-slate-600">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2"><Badge variant={log.action === 'DELETE' ? 'destructive' : log.action === 'CREATE' ? 'default' : 'secondary'} className="text-[10px]">{log.action}</Badge></td>
                    <td className="px-4 py-2 font-mono text-xs">{log.entityType}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500 truncate max-w-xs">{log.entityId}</td>
                    <td className="px-4 py-2 text-slate-700">{log.user}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{log.ipAddress || '—'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
