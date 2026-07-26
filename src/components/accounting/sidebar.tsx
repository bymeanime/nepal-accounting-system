'use client'

import { type ViewKey } from '@/app/page'
import { cn } from '@/lib/utils'
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
} from 'lucide-react'

interface SidebarProps {
  currentView: ViewKey
  onNavigate: (v: ViewKey) => void
  todayBs: string
}

interface NavItem {
  key: ViewKey
  label: string
  labelNp: string
  icon: React.ComponentType<{ className?: string }>
  group: string
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', labelNp: 'ड्यासबोर्ड', icon: LayoutDashboard, group: 'Overview' },

  { key: 'invoice-entry', label: 'New Sales Invoice', labelNp: 'बिक्री बिल', icon: Receipt, group: 'Transactions' },
  { key: 'invoices-list', label: 'Sales Invoices', labelNp: 'बिक्री सूची', icon: InvoiceIcon, group: 'Transactions' },
  { key: 'purchase-bill', label: 'Purchase Bills', labelNp: 'खरिद बिल', icon: ShoppingCart, group: 'Transactions' },
  { key: 'vouchers', label: 'Journal Vouchers', labelNp: 'भौचर', icon: BookOpen, group: 'Transactions' },
  { key: 'parties', label: 'Customers & Suppliers', labelNp: 'ग्राहक र आपूर्तिकर्ता', icon: Users, group: 'Transactions' },

  { key: 'chart-of-accounts', label: 'Chart of Accounts', labelNp: 'खाता वर्गीकरण', icon: Building2, group: 'Master' },

  { key: 'vat-return', label: 'VAT Return (V48)', labelNp: 'VAT रिटर्न', icon: Calculator, group: 'Tax & Compliance' },
  { key: 'payroll', label: 'Payroll & SSF', labelNp: 'तलब र SSF', icon: Wallet, group: 'Tax & Compliance' },

  { key: 'trial-balance', label: 'Trial Balance', labelNp: 'तलपाना', icon: FileSpreadsheet, group: 'Reports' },
  { key: 'profit-loss', label: 'Profit & Loss', labelNp: 'नाफा नोक्सान', icon: FileText, group: 'Reports' },
  { key: 'balance-sheet', label: 'Balance Sheet', labelNp: 'ब्यालेन्स सिट', icon: Scale, group: 'Reports' },
]

export function Sidebar({ currentView, onNavigate, todayBs }: SidebarProps) {
  const groups: string[] = Array.from(new Set(NAV.map(n => n.group)))

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-1.25rem)] sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-red-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            ने
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm leading-tight">Nepal Accounting</div>
            <div className="text-[10px] text-slate-500">नेपाली लेखा प्रणाली</div>
          </div>
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
        {groups.map(group => (
          <div key={group} className="mb-4">
            <div className="px-4 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {group}
            </div>
            {NAV.filter(n => n.group === group).map(item => {
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
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200 text-[10px] text-slate-500">
        <div className="flex items-center justify-between">
          <span>FY 2082/83</span>
          <span className="text-slate-400">v1.0</span>
        </div>
      </div>
    </aside>
  )
}
