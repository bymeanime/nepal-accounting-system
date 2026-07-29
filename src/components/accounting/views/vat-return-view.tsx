'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatNpr, formatNprWithSymbol } from '@/lib/format'
import { Calculator, FileDown, AlertCircle, CheckCircle2 } from 'lucide-react'

interface MonthOption { value: string; label: string; labelNp: string }
interface VatReturnData {
  period: string
  periodLabel: string
  tenant: { name: string; pan: string; vatNumber: string }
  sales: Array<{
    invoiceNo: string; bsDate: string; partyName: string; partyPan: string;
    invoiceType: string; taxableAmount: number; vatAmount: number;
    zeroRatedAmount: number; exemptAmount: number; totalAmount: number;
  }>
  purchases: Array<{
    billNo: string; bsDate: string; partyName: string; partyPan: string;
    vendorBillNo: string; taxableAmount: number; vatAmount: number;
    tdsSection: string; tdsAmount: number; totalAmount: number;
  }>
  summary: {
    periodBs: string
    taxableSales: number
    zeroRatedSales: number
    exemptSales: number
    outputVat: number
    taxablePurchases: number
    inputVat: number
    netVatPayable: number
    vatRefundable: number
    totalSales: number
    totalPurchases: number
  }
  filingDeadline: string
}

export function VatReturnView() {
  const [months, setMonths] = useState<MonthOption[]>([])
  const [period, setPeriod] = useState('')
  const [data, setData] = useState<VatReturnData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/calendar')
      .then(r => r.json())
      .then(d => {
        setMonths(d.months || [])
        // Default to current BS month
        const todayBsParts = d.today.bsParts
        if (todayBsParts) {
          const currentMonth = `${todayBsParts.year}-${String(todayBsParts.month).padStart(2, '0')}`
          setPeriod(currentMonth)
        }
      })
  }, [])

  useEffect(() => {
    if (!period) return
    let active = true
    fetch(`/api/vat-return?period=${period}`)
      .then(r => r.json())
      .then(d => { if (active) setData(d) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [period])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            VAT Return — Form V48
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monthly VAT return as per Nepal VAT Act · Due by 25th of following BS month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select period" /></SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data && (
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <a href={`/api/export/vat-return?period=${period}`} target="_blank" rel="noreferrer">
                  <FileDown className="w-4 h-4 mr-2" />
                  Export PDF
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      {loading && <div className="text-slate-500">Computing VAT return...</div>}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs text-slate-500">Output VAT (Sales)</div>
              <div className="text-xl font-bold text-blue-700">{formatNprWithSymbol(data.summary.outputVat)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">From {data.sales.length} sales invoices</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-500">Input VAT (Purchases)</div>
              <div className="text-xl font-bold text-emerald-700">{formatNprWithSymbol(data.summary.inputVat)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">From {data.purchases.length} purchase bills</div>
            </Card>
            <Card className={`p-4 ${data.summary.netVatPayable > 0 ? 'ring-2 ring-rose-300' : ''}`}>
              <div className="text-xs text-slate-500">Net VAT Payable</div>
              <div className="text-xl font-bold text-rose-700">{formatNprWithSymbol(data.summary.netVatPayable)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{data.filingDeadline}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-500">VAT Carry Forward</div>
              <div className="text-xl font-bold text-slate-700">{formatNprWithSymbol(data.summary.vatRefundable)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">If input {'>'} output</div>
            </Card>
          </div>

          {/* Filing details banner */}
          <div className={`p-4 rounded-lg ${data.summary.netVatPayable > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <div className="flex items-start gap-3">
              {data.summary.netVatPayable > 0 ? (
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold text-slate-900">
                  {data.tenant.name} · PAN: {data.tenant.pan} · VAT: {data.tenant.vatNumber}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  VAT Return for BS month <strong>{data.period}</strong> ({data.periodLabel})
                </div>
                {data.summary.netVatPayable > 0 ? (
                  <div className="text-sm mt-2 text-amber-900">
                    You need to pay <strong>{formatNprWithSymbol(data.summary.netVatPayable)}</strong> as net VAT for this period.
                    File the return on the <a href="https://irdtaxpayer.gov.np" target="_blank" rel="noreferrer" className="underline font-medium">IRD Taxpayer Portal</a> by the 25th of next BS month.
                  </div>
                ) : (
                  <div className="text-sm mt-2 text-emerald-900">
                    No net VAT payable for this period. {data.summary.vatRefundable > 0 && `Rs ${formatNpr(data.summary.vatRefundable)} input VAT can be carried forward.`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sales VAT book */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3">📊 Sales (Purchases) VAT Book — Output VAT</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs text-slate-500">
                    <th className="px-3 py-2 font-medium">Invoice No</th>
                    <th className="px-3 py-2 font-medium">BS Date</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">PAN</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium text-right">Taxable</th>
                    <th className="px-3 py-2 font-medium text-right">Zero</th>
                    <th className="px-3 py-2 font-medium text-right">Exempt</th>
                    <th className="px-3 py-2 font-medium text-right">VAT</th>
                    <th className="px-3 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-8 text-slate-400">No sales in this period</td></tr>
                  ) : data.sales.map((s, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-3 py-2 font-mono text-xs">{s.invoiceNo}</td>
                      <td className="px-3 py-2">{s.bsDate}</td>
                      <td className="px-3 py-2">{s.partyName}</td>
                      <td className="px-3 py-2">{s.partyPan || '—'}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{s.invoiceType}</Badge></td>
                      <td className="px-3 py-2 text-right">{formatNpr(s.taxableAmount)}</td>
                      <td className="px-3 py-2 text-right">{formatNpr(s.zeroRatedAmount)}</td>
                      <td className="px-3 py-2 text-right">{formatNpr(s.exemptAmount)}</td>
                      <td className="px-3 py-2 text-right text-blue-700 font-medium">{formatNpr(s.vatAmount)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatNpr(s.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {data.sales.length > 0 && (
                  <tfoot className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-right">Total</td>
                      <td className="px-3 py-2 text-right">{formatNpr(data.summary.taxableSales)}</td>
                      <td className="px-3 py-2 text-right">{formatNpr(data.summary.zeroRatedSales)}</td>
                      <td className="px-3 py-2 text-right">{formatNpr(data.summary.exemptSales)}</td>
                      <td className="px-3 py-2 text-right text-blue-700">{formatNpr(data.summary.outputVat)}</td>
                      <td className="px-3 py-2 text-right">{formatNpr(data.summary.totalSales)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>

          {/* Purchase VAT book */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3">🛒 Purchase VAT Book — Input VAT</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs text-slate-500">
                    <th className="px-3 py-2 font-medium">Bill No</th>
                    <th className="px-3 py-2 font-medium">BS Date</th>
                    <th className="px-3 py-2 font-medium">Supplier</th>
                    <th className="px-3 py-2 font-medium">PAN</th>
                    <th className="px-3 py-2 font-medium">TDS</th>
                    <th className="px-3 py-2 font-medium text-right">Taxable</th>
                    <th className="px-3 py-2 font-medium text-right">VAT</th>
                    <th className="px-3 py-2 font-medium text-right">TDS</th>
                    <th className="px-3 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.purchases.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-slate-400">No purchases in this period</td></tr>
                  ) : data.purchases.map((p, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-3 py-2 font-mono text-xs">{p.billNo}</td>
                      <td className="px-3 py-2">{p.bsDate}</td>
                      <td className="px-3 py-2">{p.partyName}</td>
                      <td className="px-3 py-2">{p.partyPan || '—'}</td>
                      <td className="px-3 py-2">{p.tdsSection ? <Badge variant="outline" className="text-[10px]">{p.tdsSection}</Badge> : '—'}</td>
                      <td className="px-3 py-2 text-right">{formatNpr(p.taxableAmount)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700 font-medium">{formatNpr(p.vatAmount)}</td>
                      <td className="px-3 py-2 text-right text-amber-700">{formatNpr(p.tdsAmount)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatNpr(p.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {data.purchases.length > 0 && (
                  <tfoot className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-right">Total</td>
                      <td className="px-3 py-2 text-right">{formatNpr(data.summary.taxablePurchases)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatNpr(data.summary.inputVat)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>

          {/* V48 return summary */}
          <Card className="p-5 bg-gradient-to-br from-blue-50 to-white border-blue-200">
            <h3 className="font-semibold text-slate-900 mb-3">📋 Form V48 — Monthly VAT Return Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-600">Taxable Sales (Domestic)</span>
                <span className="font-medium">{formatNpr(data.summary.taxableSales)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-600">Output VAT (13% on taxable sales)</span>
                <span className="font-medium text-blue-700">{formatNpr(data.summary.outputVat)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-600">Zero-rated Sales (Exports)</span>
                <span className="font-medium">{formatNpr(data.summary.zeroRatedSales)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-600">Input VAT (from purchases)</span>
                <span className="font-medium text-emerald-700">{formatNpr(data.summary.inputVat)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-600">Exempt Sales</span>
                <span className="font-medium">{formatNpr(data.summary.exemptSales)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-600">Total Taxable Purchases</span>
                <span className="font-medium">{formatNpr(data.summary.taxablePurchases)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Total Sales</span>
                <span className="font-medium">{formatNpr(data.summary.totalSales)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Total Purchases</span>
                <span className="font-medium">{formatNpr(data.summary.totalPurchases)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t-2 border-slate-300 flex justify-between text-base font-bold">
              <span>NET VAT PAYABLE</span>
              <span className="text-rose-700">{formatNprWithSymbol(data.summary.netVatPayable)}</span>
            </div>
            {data.summary.vatRefundable > 0 && (
              <div className="flex justify-between text-sm font-medium text-emerald-700 mt-1">
                <span>VAT Carry Forward (Refundable)</span>
                <span>{formatNprWithSymbol(data.summary.vatRefundable)}</span>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
