'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from '@/components/accounting/sidebar'
import { DashboardView } from '@/components/accounting/views/dashboard-view'
import { ChartOfAccountsView } from '@/components/accounting/views/chart-of-accounts-view'
import { VouchersView } from '@/components/accounting/views/vouchers-view'
import { InvoiceEntryView } from '@/components/accounting/views/invoice-entry-view'
import { PurchaseBillView } from '@/components/accounting/views/purchase-bill-view'
import { PartiesView } from '@/components/accounting/views/parties-view'
import { VatReturnView } from '@/components/accounting/views/vat-return-view'
import { TrialBalanceView } from '@/components/accounting/views/trial-balance-view'
import { ProfitLossView } from '@/components/accounting/views/profit-loss-view'
import { BalanceSheetView } from '@/components/accounting/views/balance-sheet-view'
import { PayrollView } from '@/components/accounting/views/payroll-view'
import { InvoicesListView } from '@/components/accounting/views/invoices-list-view'

export type ViewKey =
  | 'dashboard'
  | 'chart-of-accounts'
  | 'vouchers'
  | 'invoice-entry'
  | 'invoices-list'
  | 'purchase-bill'
  | 'parties'
  | 'vat-return'
  | 'trial-balance'
  | 'profit-loss'
  | 'balance-sheet'
  | 'payroll'

export default function Home() {
  const [view, setView] = useState<ViewKey>('dashboard')
  const [todayBs, setTodayBs] = useState<string>('')

  useEffect(() => {
    fetch('/api/calendar')
      .then(r => r.json())
      .then(d => setTodayBs(d.today.bs))
      .catch(() => {})
  }, [])

  const renderView = useCallback(() => {
    switch (view) {
      case 'dashboard': return <DashboardView onNavigate={setView} />
      case 'chart-of-accounts': return <ChartOfAccountsView />
      case 'vouchers': return <VouchersView />
      case 'invoice-entry': return <InvoiceEntryView onSaved={() => setView('invoices-list')} />
      case 'invoices-list': return <InvoicesListView />
      case 'purchase-bill': return <PurchaseBillView />
      case 'parties': return <PartiesView />
      case 'vat-return': return <VatReturnView />
      case 'trial-balance': return <TrialBalanceView />
      case 'profit-loss': return <ProfitLossView />
      case 'balance-sheet': return <BalanceSheetView />
      case 'payroll': return <PayrollView />
      default: return <DashboardView onNavigate={setView} />
    }
  }, [view])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Top bar with Nepali flag colors */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-red-600 to-blue-900" />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          currentView={view}
          onNavigate={setView}
          todayBs={todayBs}
        />

        <main className="flex-1 overflow-auto">
          {renderView()}
        </main>
      </div>

      <footer className="bg-slate-900 text-slate-300 text-xs py-2 px-4 flex items-center justify-between">
        <span>
          🇳🇵 Nepal Accounting System — Built for Nepali Businesses · BS Calendar · IRD Compliant · NFRS
        </span>
        <span className="text-slate-500">
          {todayBs && `Today: ${todayBs} BS`}
        </span>
      </footer>
    </div>
  )
}
