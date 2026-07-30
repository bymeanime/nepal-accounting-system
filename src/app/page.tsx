'use client'

import { useEffect, useState, useCallback } from 'react'
import { I18nProvider } from '@/components/accounting/i18n-provider'
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
import { ItemsView } from '@/components/accounting/views/items-view'
import { StockMovementsView } from '@/components/accounting/views/stock-movements-view'
import { FixedAssetsView } from '@/components/accounting/views/fixed-assets-view'
import { FxRatesView } from '@/components/accounting/views/fx-rates-view'
import { TenantsView } from '@/components/accounting/views/tenants-view'
import { SettingsView } from '@/components/accounting/views/settings-view'
import { CashFlowView } from '@/components/accounting/views/cash-flow-view'
import { CreditNotesView } from '@/components/accounting/views/credit-notes-view'
import { DebitNotesView } from '@/components/accounting/views/debit-notes-view'
import { AuditLogView } from '@/components/accounting/views/audit-log-view'

export type ViewKey =
  | 'dashboard'
  | 'chart-of-accounts'
  | 'vouchers'
  | 'invoice-entry'
  | 'invoices-list'
  | 'purchase-bill'
  | 'parties'
  | 'items'
  | 'stock-movements'
  | 'fixed-assets'
  | 'fx-rates'
  | 'tenants'
  | 'settings'
  | 'credit-notes'
  | 'debit-notes'
  | 'vat-return'
  | 'trial-balance'
  | 'profit-loss'
  | 'balance-sheet'
  | 'cash-flow'
  | 'payroll'
  | 'audit-log'

function App() {
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
      case 'items': return <ItemsView />
      case 'stock-movements': return <StockMovementsView />
      case 'fixed-assets': return <FixedAssetsView />
      case 'fx-rates': return <FxRatesView />
      case 'tenants': return <TenantsView />
      case 'settings': return <SettingsView />
      case 'vat-return': return <VatReturnView />
      case 'trial-balance': return <TrialBalanceView />
      case 'profit-loss': return <ProfitLossView />
      case 'balance-sheet': return <BalanceSheetView />
      case 'cash-flow': return <CashFlowView />
      case 'payroll': return <PayrollView />
      case 'credit-notes': return <CreditNotesView />
      case 'debit-notes': return <DebitNotesView />
      case 'audit-log': return <AuditLogView />
      default: return <DashboardView onNavigate={setView} />
    }
  }, [view])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
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

export default function Home() {
  return (
    <I18nProvider>
      <App />
    </I18nProvider>
  )
}
