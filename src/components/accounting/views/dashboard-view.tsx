'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatNpr, formatNprWithSymbol, formatNprCompact } from '@/lib/format'
import { type ViewKey } from '@/app/page'
import {
  Wallet, Landmark, TrendingUp, TrendingDown, Receipt,
  ArrowUpRight, ArrowDownRight, AlertCircle, Calendar,
  FileText, Calculator, Shield, IndianRupee
} from 'lucide-react'

interface DashboardData {
  tenant: {
    name: string
    pan: string
    vatNumber: string
    address: string
    municipality: string
    district: string
    province: string
    phone: string
    email: string
  }
  today: {
    bs: string
    bsLong: string
    ad: string
    weekday: string
  }
  fiscalYear: {
    label: string
    startBs: string
    endBs: string
  }
  summary: {
    cashBalance: number
    bankBalance: number
    cashAndBank: number
    accountsReceivable: number
    accountsPayable: number
    outputVat: number
    inputVat: number
    netVatPayable: number
    tdsPayable: number
    ssfPayable: number
    fyIncome: number
    fyExpense: number
    netProfit: number
  }
  recentVouchers: Array<{
    id: string
    voucherNo: string
    voucherType: string
    bsDate: string
    narration: string
    totalDebit: number
    totalCredit: number
    status: string
  }>
  recentInvoices: Array<{
    id: string
    invoiceNo: string
    bsDate: string
    partyName: string
    partyPan: string
    totalAmount: number
    status: string
    invoiceType: string
  }>
}

export function DashboardView({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    )
  }

  const { tenant, today, fiscalYear, summary, recentVouchers, recentInvoices } = data

  const vatReminders = [
    { label: 'VAT Return (V48)', due: '25th of next BS month', amount: summary.netVatPayable, type: 'VAT' },
    { label: 'TDS Return (Form 78)', due: '25th of next BS month', amount: summary.tdsPayable, type: 'TDS' },
  ].filter(r => r.amount > 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Calendar className="w-3 h-3" />
            <span>{today.bsLong} BS · {today.ad} AD · {today.weekday}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{tenant.name}</h1>
          <div className="text-sm text-slate-500 mt-0.5">
            PAN: {tenant.pan} · VAT: {tenant.vatNumber} · {tenant.municipality}, {tenant.district}, {tenant.province}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onNavigate('invoice-entry')} className="bg-blue-600 hover:bg-blue-700">
            <Receipt className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
          <Button onClick={() => onNavigate('vat-return')} variant="outline">
            <Calculator className="w-4 h-4 mr-2" />
            VAT Return
          </Button>
        </div>
      </div>

      {/* Fiscal year banner */}
      <div className="rounded-lg bg-gradient-to-r from-blue-600 to-red-600 text-white p-4 flex items-center justify-between">
        <div>
          <div className="text-xs opacity-80">Current Fiscal Year</div>
          <div className="text-xl font-bold">{fiscalYear.label} BS</div>
          <div className="text-xs opacity-80 mt-0.5">{fiscalYear.startBs} → {fiscalYear.endBs}</div>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-80">Net Profit (FYTD)</div>
          <div className="text-2xl font-bold">{formatNprCompact(summary.netProfit)}</div>
          <div className="text-xs opacity-80 mt-0.5">
            Income: {formatNprCompact(summary.fyIncome)} · Expense: {formatNprCompact(summary.fyExpense)}
          </div>
        </div>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Cash in Hand"
          value={summary.cashBalance}
          icon={Wallet}
          color="emerald"
        />
        <StatCard
          title="Cash at Bank"
          value={summary.bankBalance}
          icon={Landmark}
          color="blue"
        />
        <StatCard
          title="Accounts Receivable"
          value={summary.accountsReceivable}
          icon={ArrowUpRight}
          color="amber"
          subtitle="Money owed to us"
        />
        <StatCard
          title="Accounts Payable"
          value={summary.accountsPayable}
          icon={ArrowDownRight}
          color="rose"
          subtitle="We owe suppliers"
        />
      </div>

      {/* Tax compliance cards */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Tax Compliance Dashboard
          <Badge variant="outline" className="ml-2">IRD Nepal</Badge>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <TaxCard
            title="Output VAT"
            subtitle="Collected on sales"
            amount={summary.outputVat}
            color="blue"
          />
          <TaxCard
            title="Input VAT"
            subtitle="Paid on purchases"
            amount={summary.inputVat}
            color="emerald"
          />
          <TaxCard
            title="Net VAT Payable"
            subtitle="Due by 25th next BS month"
            amount={summary.netVatPayable}
            color="rose"
            highlight
          />
          <TaxCard
            title="TDS Payable"
            subtitle="Total TDS deducted"
            amount={summary.tdsPayable}
            color="amber"
          />
        </div>
      </div>

      {/* Two-column: Recent invoices + Tax reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent invoices */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Recent Sales Invoices
            </h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('invoices-list')}>
              View all →
            </Button>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No invoices yet. Create your first invoice.
            </div>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{inv.invoiceNo}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {inv.partyName} · {inv.bsDate} BS
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">{formatNpr(inv.totalAmount)}</div>
                    <div className="flex items-center gap-1 justify-end">
                      {inv.invoiceType !== 'TAX_INVOICE' && (
                        <Badge variant="outline" className="text-[10px]">{inv.invoiceType}</Badge>
                      )}
                      <Badge
                        variant={inv.status === 'PAID' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* VAT/TDS reminders */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Upcoming Compliance Deadlines
          </h3>
          {vatReminders.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No pending tax liabilities 🎉
            </div>
          ) : (
            <div className="space-y-3">
              {vatReminders.map(r => (
                <div key={r.label} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div>
                    <div className="text-sm font-medium text-amber-900">{r.label}</div>
                    <div className="text-xs text-amber-700">Due: {r.due}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-amber-900">{formatNprWithSymbol(r.amount)}</div>
                    <Button size="sm" variant="outline" className="h-7 mt-1" onClick={() => onNavigate('vat-return')}>
                      File now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500 mb-2">Quick Reports</div>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" onClick={() => onNavigate('trial-balance')}>Trial Balance</Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate('profit-loss')}>P&L Statement</Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate('balance-sheet')}>Balance Sheet</Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent vouchers */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            Recent Journal Vouchers
          </h3>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('vouchers')}>
            View all →
          </Button>
        </div>
        {recentVouchers.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No vouchers posted.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                  <th className="pb-2 font-medium">Voucher No</th>
                  <th className="pb-2 font-medium">BS Date</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Narration</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentVouchers.map(v => (
                  <tr key={v.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 font-mono text-xs text-slate-700">{v.voucherNo}</td>
                    <td className="py-2 text-slate-600">{v.bsDate}</td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-[10px]">{v.voucherType}</Badge>
                    </td>
                    <td className="py-2 text-slate-700 max-w-xs truncate">{v.narration}</td>
                    <td className="py-2 text-right font-medium text-slate-900">{formatNpr(v.totalDebit)}</td>
                    <td className="py-2">
                      <Badge variant="default" className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{v.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Footer info */}
      <div className="text-xs text-slate-400 text-center py-4">
        Built for Nepali businesses · BS calendar (Bikram Sambat) · NFRS-compliant · IRD VAT/TDS compliant
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color, subtitle }: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: 'emerald' | 'blue' | 'amber' | 'rose'
  subtitle?: string
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  }
  return (
    <Card className="p-4 border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 font-medium">{title}</span>
        <div className={`p-1.5 rounded-md border ${colorClasses[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="text-xl font-bold text-slate-900">{formatNprWithSymbol(value)}</div>
      {subtitle && <div className="text-[10px] text-slate-400 mt-0.5">{subtitle}</div>}
    </Card>
  )
}

function TaxCard({ title, subtitle, amount, color, highlight }: {
  title: string
  subtitle: string
  amount: number
  color: 'blue' | 'emerald' | 'rose' | 'amber'
  highlight?: boolean
}) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100/50 border-blue-200',
    emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-200',
    rose: 'from-rose-50 to-rose-100/50 border-rose-200',
    amber: 'from-amber-50 to-amber-100/50 border-amber-200',
  }
  return (
    <div className={`rounded-lg border bg-gradient-to-br ${colorClasses[color]} p-4 ${highlight ? 'ring-2 ring-rose-300' : ''}`}>
      <div className="text-xs font-medium text-slate-700">{title}</div>
      <div className="text-xl font-bold text-slate-900 mt-1">{formatNprWithSymbol(amount)}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>
    </div>
  )
}
