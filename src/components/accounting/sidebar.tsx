'use client'

import { type ViewKey } from '@/app/page'
import { cn } from '@/lib/utils'
import { useI18n } from '@/components/accounting/i18n-provider'
import {
  LayoutDashboard,
  FileText,
  Receipt,
  ShoppingCart,
  Users,
  BookOpen,
  Calculator,
  FileSpreadsheet,
  Scale,
  Wallet,
  Receipt as InvoiceIcon,
  Building2,
  Calendar,
  Package,
  PackageSearch,
  Boxes,
  Languages,
  DollarSign,
  Building,
  Settings,
} from 'lucide-react'

interface SidebarProps {
  currentView: ViewKey
  onNavigate: (v: ViewKey) => void
  todayBs: string
}

interface NavItem {
  key: ViewKey
  labelKey: 'dashboard' | 'newInvoice' | 'salesInvoices' | 'purchaseBills' | 'journalVouchers' | 'parties' | 'chartOfAccounts' | 'items' | 'stockMovements' | 'fixedAssets' | 'vatReturn' | 'payroll' | 'trialBalance' | 'profitLoss' | 'balanceSheet' | 'fxRates' | 'tenants' | 'settings'
  icon: React.ComponentType<{ className?: string }>
  group: 'navOverview' | 'navTransactions' | 'navMaster' | 'navInventory' | 'navTaxCompliance' | 'navReports'
}

const NAV: NavItem[] = [
  { key: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard, group: 'navOverview' },

  { key: 'invoice-entry', labelKey: 'newInvoice', icon: Receipt, group: 'navTransactions' },
  { key: 'invoices-list', labelKey: 'salesInvoices', icon: InvoiceIcon, group: 'navTransactions' },
  { key: 'purchase-bill', labelKey: 'purchaseBills', icon: ShoppingCart, group: 'navTransactions' },
  { key: 'vouchers', labelKey: 'journalVouchers', icon: BookOpen, group: 'navTransactions' },
  { key: 'parties', labelKey: 'parties', icon: Users, group: 'navTransactions' },

  { key: 'tenants', labelKey: 'tenants', icon: Building, group: 'navMaster' },
  { key: 'chart-of-accounts', labelKey: 'chartOfAccounts', icon: Building2, group: 'navMaster' },
  { key: 'settings', labelKey: 'settings', icon: Settings, group: 'navMaster' },
  { key: 'items', labelKey: 'items', icon: Package, group: 'navInventory' },
  { key: 'stock-movements', labelKey: 'stockMovements', icon: PackageSearch, group: 'navInventory' },
  { key: 'fixed-assets', labelKey: 'fixedAssets', icon: Boxes, group: 'navInventory' },
  { key: 'fx-rates', labelKey: 'fxRates', icon: DollarSign, group: 'navInventory' },

  { key: 'vat-return', labelKey: 'vatReturn', icon: Calculator, group: 'navTaxCompliance' },
  { key: 'payroll', labelKey: 'payroll', icon: Wallet, group: 'navTaxCompliance' },

  { key: 'trial-balance', labelKey: 'trialBalance', icon: FileSpreadsheet, group: 'navReports' },
  { key: 'profit-loss', labelKey: 'profitLoss', icon: FileText, group: 'navReports' },
  { key: 'balance-sheet', labelKey: 'balanceSheet', icon: Scale, group: 'navReports' },
]

export function Sidebar({ currentView, onNavigate, todayBs }: SidebarProps) {
  const { t, lang, setLang } = useI18n()
  const groupOrder: Array<'navOverview' | 'navTransactions' | 'navMaster' | 'navInventory' | 'navTaxCompliance' | 'navReports'> = ['navOverview', 'navTransactions', 'navMaster', 'navInventory', 'navTaxCompliance', 'navReports']

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-1.25rem)] sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-red-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            {lang === 'ne' ? 'ने' : 'NA'}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-slate-900 text-sm leading-tight">{t('appName')}</div>
            <div className="text-[10px] text-slate-500">
              {lang === 'ne' ? 'BS Calendar · IRD' : 'Bikram Sambat · IRD'}
            </div>
          </div>
          <button
            onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
            title="Switch language"
            aria-label="Toggle language"
          >
            <Languages className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Today's BS date badge */}
      {todayBs && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-amber-900 font-medium">{todayBs} BS</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {groupOrder.map(group => {
          const items = NAV.filter(n => n.group === group)
          if (items.length === 0) return null
          return (
            <div key={group} className="mb-4">
              <div className="px-4 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {t(group)}
              </div>
              {items.map(item => {
                const Icon = item.icon
                const isActive = currentView === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => onNavigate(item.key)}
                    className={cn(
                      'w-full text-left px-4 py-2 flex items-center gap-2.5 text-sm transition-colors border-l-2',
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-blue-600 font-medium'
                        : 'text-slate-600 hover:bg-slate-50 border-transparent'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{t(item.labelKey)}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-200 text-[10px] text-slate-500">
        <div className="flex items-center justify-between">
          <span>FY 2082/83</span>
          <button
            onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-medium"
          >
            {lang === 'en' ? 'ने' : 'EN'}
          </button>
        </div>
      </div>
    </aside>
  )
}
