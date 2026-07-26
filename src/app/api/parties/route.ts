import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  const where: any = { tenantId: DEMO_TENANT_ID }
  if (type) where.type = type

  const parties = await db.party.findMany({
    where,
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ parties })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, nameNp, type, pan, vatNumber, phone, email, address, district, tdsSection, creditLimit, openingBalance } = body

  if (!name || !type) {
    return NextResponse.json({ error: 'Missing required fields: name, type' }, { status: 400 })
  }

  const created = await db.party.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      name,
      nameNp,
      type,
      pan,
      vatNumber,
      phone,
      email,
      address,
      district,
      tdsSection,
      creditLimit: creditLimit ?? 0,
      openingBalance: openingBalance ?? 0,
    },
  })
  return NextResponse.json({ party: created })
}
