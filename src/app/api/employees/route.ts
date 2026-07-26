// ============================================================
// API: Employees — list and create
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET() {
  const employees = await db.employee.findMany({
    where: { tenantId: DEMO_TENANT_ID },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ employees })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, nameNp, pan, ssfNumber, department, designation, joiningBsDate, basicSalary, allowance, residency, phone, email } = body

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const created = await db.employee.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      name,
      nameNp,
      pan,
      ssfNumber,
      department,
      designation,
      joiningBsDate,
      basicSalary: basicSalary || 0,
      allowance: allowance || 0,
      residency: residency || 'RESIDENT',
      status: 'ACTIVE',
      phone,
      email,
    },
  })
  return NextResponse.json({ employee: created })
}
