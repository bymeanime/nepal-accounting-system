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
import { formatNpr } from '@/lib/format'
import { ArrowRight, RefreshCw, Coins, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

interface FxRate {
  currency: string
  name: string
  buy: number
  sell: number
  unit: number
  nprPerUnit: number
  date: string
}

export function FxRatesView() {
  const [rates, setRates] = useState<FxRate[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchedAt, setFetchedAt] = useState<string>('')
  const [converting, setConverting] = useState(false)

  // Converter state
  const [convAmount, setConvAmount] = useState<number>(100)
  const [convFrom, setConvFrom] = useState<string>('USD')
  const [convTo, setConvTo] = useState<string>('NPR')
  const [convResult, setConvResult] = useState<any>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/fx-rates')
      .then(r => r.json())
      .then(d => {
        setRates(d.rates || [])
        setFetchedAt(d.fetchedAt || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleConvert = async () => {
    if (!convAmount || !convFrom || !convTo) return
    setConverting(true)
    try {
      const res = await fetch('/api/fx-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: convAmount, fromCurrency: convFrom, toCurrency: convTo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setConvResult(data)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Toaster richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-blue-600" />
            Foreign Exchange Rates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Live rates from Nepal Rastra Bank (NRB) · supports multi-currency transactions
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {fetchedAt && (
        <div className="text-xs text-slate-500">
          Source: <Badge variant="outline" className="text-[10px]">Nepal Rastra Bank</Badge> ·
          Fetched: {new Date(fetchedAt).toLocaleString()} · Base currency: NPR
        </div>
      )}

      {/* Currency Converter */}
      <Card className="p-5 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <div className="flex items-center gap-2 mb-3">
          <Coins className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Currency Converter</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <Label className="text-xs">Amount</Label>
            <Input
              type="number"
              value={convAmount}
              onChange={e => setConvAmount(Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Select value={convFrom} onValueChange={setConvFrom}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NPR">NPR — Nepali Rupee</SelectItem>
                {rates.map(r => (
                  <SelectItem key={r.currency} value={r.currency}>{r.currency} — {r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-center pb-2">
            <ArrowRight className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Select value={convTo} onValueChange={setConvTo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NPR">NPR — Nepali Rupee</SelectItem>
                {rates.map(r => (
                  <SelectItem key={r.currency} value={r.currency}>{r.currency} — {r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleConvert} disabled={converting}>
            {converting ? 'Converting...' : 'Convert'}
          </Button>
        </div>
        {convResult && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-blue-100">
            <div className="text-xs text-slate-500 mb-1">Conversion Result</div>
            <div className="text-2xl font-bold text-slate-900">
              {convResult.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {convResult.fromCurrency}
              <span className="mx-3 text-slate-400">=</span>
              <span className="text-blue-700">
                {convResult.convertedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {convResult.toCurrency}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Rate: 1 {convResult.fromCurrency} = {convResult.rate.toLocaleString('en-IN', { maximumFractionDigits: 4 })} {convResult.toCurrency}
              {convResult.nprEquivalent !== convResult.convertedAmount && convResult.fromCurrency !== 'NPR' && convResult.toCurrency !== 'NPR' && (
                <span className="ml-3">· NPR equivalent: Rs {convResult.nprEquivalent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Rates table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold">All Exchange Rates (per NPR)</h3>
          <Badge variant="outline">{rates.length} currencies</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Currency</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium text-right">Unit</th>
                <th className="px-4 py-2 font-medium text-right">Buy (NPR)</th>
                <th className="px-4 py-2 font-medium text-right">Sell (NPR)</th>
                <th className="px-4 py-2 font-medium text-right">NPR per 1 unit</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">Loading NRB rates...</td></tr>
              ) : rates.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">No rates available</td></tr>
              ) : rates.map(r => (
                <tr key={r.currency} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-mono font-semibold text-slate-900">{r.currency}</td>
                  <td className="px-4 py-2 text-slate-600">{r.name}</td>
                  <td className="px-4 py-2 text-right">{r.unit}</td>
                  <td className="px-4 py-2 text-right text-emerald-700">{formatNpr(r.buy)}</td>
                  <td className="px-4 py-2 text-right text-rose-700">{formatNpr(r.sell)}</td>
                  <td className="px-4 py-2 text-right font-bold text-blue-700">
                    {formatNpr(r.nprPerUnit)}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="text-xs text-slate-700 space-y-1">
          <div className="font-semibold text-slate-900">About NRB Exchange Rates</div>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Rates published daily by Nepal Rastra Bank (NRB) — the central bank of Nepal</li>
            <li><strong>Buy rate</strong>: Rate at which banks buy foreign currency from customers</li>
            <li><strong>Sell rate</strong>: Rate at which banks sell foreign currency to customers</li>
            <li><strong>Unit</strong>: Number of foreign currency units (e.g., 1 USD = 1 unit, 1 INR = 100 units)</li>
            <li>Used for: import/export invoicing, foreign vendor payments, multi-currency accounting</li>
            <li>In Nepal, base currency is NPR; all foreign transactions must be recorded in NPR for tax purposes</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
