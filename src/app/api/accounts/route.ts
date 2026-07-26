import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET() {
  const accounts = await db.account.findMany({
    where: { tenantId: DEMO_TENANT_ID },
    orderBy: [{ code: 'asc' }],
    include: { parent: true },
  })

  const byCode: Record<string, any> = {}
  for (const a of accounts) byCode[a.code] = { ...a, children: [] }

  const roots: any[] = []
  for (const a of accounts) {
    if (a.parentId) {
      const parent = accounts.find(p => p.id === a.parentId)
      if (parent && byCode[parent.code]) {
        byCode[parent.code].children.push(byCode[a.code])
      } else {
        roots.push(byCode[a.code])
      }
    } else {
      roots.push(byCode[a.code])
    }
  }

  return NextResponse.json({ accounts: roots, flat: accounts })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { code, name, nameNp, type, subType, isGroup, isCash, isBank, parentId, openingBalance } = body

  if (!code || !name || !type) {
    return NextResponse.json({ error: 'Missing required fields: code, name, type' }, { status: 400 })
  }

  let parentDbId: string | undefined
  if (parentId) {
    const parent = await db.account.findFirst({ where: { tenantId: DEMO_TENANT_ID, code: parentId } })
    if (parent) parentDbId = parent.id
  }

  const created = await db.account.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      code,
      name,
      nameNp,
      type,
      subType: subType || null,
      isGroup: isGroup ?? false,
      isCash: isCash ?? false,
      isBank: isBank ?? false,
      parentId: parentDbId,
      openingBalance: openingBalance ?? 0,
    },
  })
  return NextResponse.json({ account: created })
}
