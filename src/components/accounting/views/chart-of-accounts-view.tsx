'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, ChevronRight, ChevronDown } from 'lucide-react'

interface AccountNode {
  id: string
  code: string
  name: string
  nameNp: string | null
  type: string
  subType: string | null
  isGroup: boolean
  isCash: boolean
  isBank: boolean
  children: AccountNode[]
}

const TYPE_COLORS: Record<string, string> = {
  ASSET: 'bg-blue-100 text-blue-700',
  LIABILITY: 'bg-rose-100 text-rose-700',
  EQUITY: 'bg-purple-100 text-purple-700',
  INCOME: 'bg-emerald-100 text-emerald-700',
  EXPENSE: 'bg-amber-100 text-amber-700',
}

export function ChartOfAccountsView() {
  const [accounts, setAccounts] = useState<AccountNode[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['1', '2', '3', '4', '5']))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => setAccounts(d.accounts || []))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (code: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const renderNode = (node: AccountNode, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expanded.has(node.code)

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-1.5 px-2 hover:bg-slate-50 ${node.isGroup ? 'font-medium' : ''}`}
          style={{ paddingLeft: `${depth * 24 + 8}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggle(node.code)} className="p-0.5 hover:bg-slate-200 rounded">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <div className="w-4" />
          )}
          <span className="font-mono text-xs text-slate-500 w-12">{node.code}</span>
          <span className="flex-1 text-slate-900">{node.name}</span>
          {node.nameNp && <span className="text-xs text-slate-500 hidden md:inline">{node.nameNp}</span>}
          {node.isCash && <Badge variant="outline" className="text-[10px]">Cash</Badge>}
          {node.isBank && <Badge variant="outline" className="text-[10px]">Bank</Badge>}
          {node.isGroup ? (
            <Badge className={`text-[10px] ${TYPE_COLORS[node.type] || ''}`}>{node.type}</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">{node.subType || node.type}</Badge>
          )}
        </div>
        {hasChildren && isExpanded && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  const flatCount = (nodes: AccountNode[]): number => {
    let n = 0
    for (const node of nodes) {
      n += 1
      if (node.children?.length) n += flatCount(node.children)
    }
    return n
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-600" />
          Chart of Accounts
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Nepal-standard chart of accounts (Schedule V) · {flatCount(accounts)} accounts · Pre-seeded for Nepali businesses
        </p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'] as const).map(type => (
          <Card key={type} className="p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{type}</div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {accounts.filter(a => a.type === type).length} groups
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-3">
        <div className="space-y-0.5">
          {accounts.map(node => renderNode(node))}
        </div>
      </Card>

      <Card className="p-4 bg-blue-50/50 border-blue-200">
        <div className="text-xs text-slate-700 space-y-1">
          <div className="font-semibold text-slate-900">About this Chart of Accounts</div>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Follows Nepal Schedule V format used by companies for statutory filing</li>
            <li>Compatible with NFRS (Nepal Financial Reporting Standards)</li>
            <li>NPR-denominated; supports multi-currency via separate sub-ledgers</li>
            <li>Pre-mapped to VAT (codes 1040 input, 2003 output), TDS (2004), SSF (2005), Income Tax (2007)</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
