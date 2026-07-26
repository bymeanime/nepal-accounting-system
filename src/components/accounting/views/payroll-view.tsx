'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatNpr, formatNprWithSymbol } from '@/lib/format'
import { Wallet, Users, Calculator, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { SSF_RATES, INDIVIDUAL_TAX_SLABS_2083 } from '@/lib/taxEngine'

interface Employee {
  id: string
  name: string
  nameNp?: string
  designation?: string
  basicSalary: number
  allowance: number
  department?: string
}

interface PayrollRun {
  id: string
  bsMonth: string
  employee: Employee
  basicSalary: number
  allowance: number
  grossSalary: number
  ssfEmployee: number
  ssfEmployer: number
  tds: number
  netSalary: number
  status: string
}

function computePreview(basic: number, allowance: number) {
  const ssfEmployee = (basic * SSF_RATES.EMPLOYEE_PCT_OF_BASIC) / 100
  const ssfEmployer = (basic * SSF_RATES.EMPLOYER_PCT_OF_BASIC) / 100
  const gross = basic + allowance
  const annualTaxable = Math.max(0, gross * 12 - ssfEmployee * 12)
  let annualTax = 0, prev = 0
  for (const slab of INDIVIDUAL_TAX_SLABS_2083) {
    const upper = slab.upTo ?? Infinity
    if (annualTaxable > prev) {
      const inSlab = Math.min(annualTaxable, upper) - prev
      annualTax += (inSlab * slab.rate) / 100
      prev = upper
    } else break
  }
  const monthlyTax = annualTax / 12
  const net = gross - ssfEmployee - monthlyTax
  return { basic, allowance, gross, ssfEmployee, ssfEmployer, totalSsf: ssfEmployee + ssfEmployer, annualTaxable, annualTax, monthlyTax, net }
}

export function PayrollView() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [months, setMonths] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/calendar').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
      fetch('/api/payroll').then(r => r.json()),
    ])
      .then(([calData, empData, payrollData]) => {
        if (!active) return
        setMonths(calData.months || [])
        const todayBs = calData.today?.bsParts
        if (todayBs) setSelectedMonth(`${todayBs.year}-${String(todayBs.month).padStart(2, '0')}`)
        setEmployees(empData.employees || [])
        setRuns(payrollData.runs || [])
        setLoading(false)
      })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const selectedEmp = employees.find(e => e.id === selectedEmployee)
  const preview = selectedEmp ? computePreview(Number(selectedEmp.basicSalary), Number(selectedEmp.allowance)) : null

  const handleCompute = async () => {
    if (!selectedMonth) { toast.error('Select a BS month'); return }
    if (!selectedEmployee) { toast.error('Select an employee'); return }
    setComputing(true)
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bsMonth: selectedMonth, employeeId: selectedEmployee }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Payroll computed for ${data.payroll.employee.name} — Net: ${formatNpr(Number(data.payroll.netSalary))}`)
      const r = await fetch('/api/payroll')
      const d = await r.json()
      setRuns(d.runs || [])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setComputing(false)
    }
  }

  const handleRunAll = async () => {
    if (!selectedMonth) { toast.error('Select a BS month'); return }
    setComputing(true)
    try {
      const res = await fetch('/api/payroll', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bsMonth: selectedMonth }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Payroll computed for ${data.count} employees`)
      const r = await fetch('/api/payroll')
      const d = await r.json()
      setRuns(d.runs || [])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setComputing(false)
    }
  }

  const monthRuns = runs.filter(r => r.bsMonth === selectedMonth)
  const monthTotalNet = monthRuns.reduce((s, r) => s + Number(r.netSalary), 0)
  const monthTotalSsf = monthRuns.reduce((s, r) => s + Number(r.ssfEmployee) + Number(r.ssfEmployer), 0)
  const monthTotalTds = monthRuns.reduce((s, r) => s + Number(r.tds), 0)

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Toaster richColors />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-600" />
          Payroll & Social Security Fund (SSF)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Auto-computes SSF (31% of basic = 11% employee + 20% employer) + TDS on salary per FY 2083/84 slabs
        </p>
      </div>

      <Card className="p-5 border-2 border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Compute Payroll</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium">BS Month</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger><SelectValue placeholder="Select BS month" /></SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Employee</label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.designation || 'Staff'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleCompute} disabled={computing || !selectedEmployee} className="flex-1">
              <Play className="w-4 h-4 mr-1" /> Compute
            </Button>
            <Button onClick={handleRunAll} disabled={computing} variant="outline">Run All</Button>
          </div>
        </div>

        {preview && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="text-xs font-medium text-slate-600 mb-2">Live Preview — {selectedEmp?.name}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-[10px] text-slate-500">Basic Salary</div>
                <div className="font-semibold">{formatNpr(preview.basic)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Allowance</div>
                <div className="font-semibold">{formatNpr(preview.allowance)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Gross Salary</div>
                <div className="font-semibold">{formatNpr(preview.gross)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Net Salary</div>
                <div className="font-bold text-emerald-700">{formatNpr(preview.net)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">SSF Employee (11%)</div>
                <div className="font-medium text-rose-700">-{formatNpr(preview.ssfEmployee)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">SSF Employer (20%)</div>
                <div className="font-medium text-amber-700">{formatNpr(preview.ssfEmployer)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">TDS (Monthly)</div>
                <div className="font-medium text-rose-700">-{formatNpr(preview.monthlyTax)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Total SSF Contribution</div>
                <div className="font-bold text-blue-700">{formatNpr(preview.totalSsf)}</div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Annual taxable income: {formatNpr(preview.annualTaxable)} · Annual TDS: {formatNpr(preview.annualTax)} · Top rate 29% (FY 2083/84)
            </div>
          </div>
        )}
      </Card>

      {monthRuns.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-xs text-slate-500">Total Net Salary ({selectedMonth})</div>
              <div className="text-xl font-bold text-emerald-700">{formatNprWithSymbol(monthTotalNet)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-500">Total SSF Contribution (31%)</div>
              <div className="text-xl font-bold text-blue-700">{formatNprWithSymbol(monthTotalSsf)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-500">Total TDS Deducted</div>
              <div className="text-xl font-bold text-rose-700">{formatNprWithSymbol(monthTotalTds)}</div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Payroll Runs for {selectedMonth} BS
              </h3>
              <Badge variant="outline">{monthRuns.length} employees</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs text-slate-500">
                    <th className="px-4 py-2 font-medium">Employee</th>
                    <th className="px-4 py-2 font-medium">Department</th>
                    <th className="px-4 py-2 font-medium text-right">Basic</th>
                    <th className="px-4 py-2 font-medium text-right">Allowance</th>
                    <th className="px-4 py-2 font-medium text-right">Gross</th>
                    <th className="px-4 py-2 font-medium text-right">SSF Emp</th>
                    <th className="px-4 py-2 font-medium text-right">SSF Mgr</th>
                    <th className="px-4 py-2 font-medium text-right">TDS</th>
                    <th className="px-4 py-2 font-medium text-right">Net</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthRuns.map(r => (
                    <tr key={r.id} className="border-b border-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-900">{r.employee.name}</td>
                      <td className="px-4 py-2 text-slate-600">{r.employee.department || '—'}</td>
                      <td className="px-4 py-2 text-right">{formatNpr(Number(r.basicSalary))}</td>
                      <td className="px-4 py-2 text-right">{formatNpr(Number(r.allowance))}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatNpr(Number(r.grossSalary))}</td>
                      <td className="px-4 py-2 text-right text-rose-700">-{formatNpr(Number(r.ssfEmployee))}</td>
                      <td className="px-4 py-2 text-right text-amber-700">{formatNpr(Number(r.ssfEmployer))}</td>
                      <td className="px-4 py-2 text-right text-rose-700">-{formatNpr(Number(r.tds))}</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-700">{formatNpr(Number(r.netSalary))}</td>
                      <td className="px-4 py-2">
                        <Badge variant={r.status === 'PAID' ? 'default' : 'secondary'} className="text-[10px]">{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={2} className="px-4 py-2 text-right">Total</td>
                    <td className="px-4 py-2 text-right">{formatNpr(monthRuns.reduce((s,r)=>s+Number(r.basicSalary),0))}</td>
                    <td className="px-4 py-2 text-right">{formatNpr(monthRuns.reduce((s,r)=>s+Number(r.allowance),0))}</td>
                    <td className="px-4 py-2 text-right">{formatNpr(monthRuns.reduce((s,r)=>s+Number(r.grossSalary),0))}</td>
                    <td className="px-4 py-2 text-right">{formatNpr(monthRuns.reduce((s,r)=>s+Number(r.ssfEmployee),0))}</td>
                    <td className="px-4 py-2 text-right">{formatNpr(monthRuns.reduce((s,r)=>s+Number(r.ssfEmployer),0))}</td>
                    <td className="px-4 py-2 text-right">{formatNpr(monthRuns.reduce((s,r)=>s+Number(r.tds),0))}</td>
                    <td className="px-4 py-2 text-right">{formatNpr(monthTotalNet)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="text-xs text-slate-700 space-y-1">
          <div className="font-semibold text-slate-900">Social Security Fund (SSF) — Nepal</div>
          <div>Mandatory for organized employers since FY 2076/77 (B.S.)</div>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Employee contribution: <strong>11%</strong> of basic salary</li>
            <li>Employer contribution: <strong>20%</strong> of basic salary (8.33% gratuity + 1.67% additional + medical/disability/family/retirement)</li>
            <li>Total contribution: <strong>31%</strong> of basic salary</li>
            <li>Monthly filing via SSF portal</li>
          </ul>
          <div className="mt-2 pt-2 border-t border-blue-200">
            <strong>Income Tax Slabs (FY 2083/84):</strong> 0% up to Rs 10,00,000 → 10% (Rs 10-20L) → 20% (Rs 20-30L) → 25% (Rs 30-40L) → 29% (above Rs 40L). Top rate reduced from 39% in 2083/84.
          </div>
        </div>
      </Card>
    </div>
  )
}
