// ============================================================
// API: Payroll — compute monthly salary with SSF (31%) + TDS
// GET  /api/payroll — list payroll runs
// POST /api/payroll { bsMonth, employeeId } — compute + save payroll run
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateSsf, calculateSalaryTds } from '@/lib/taxEngine'
import { bsStringToAd } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bsMonth = searchParams.get('bsMonth')

  const where: any = { tenantId: DEMO_TENANT_ID }
  if (bsMonth) where.bsMonth = bsMonth

  const runs = await db.payrollRun.findMany({
    where,
    orderBy: { bsMonth: 'desc' },
    include: { employee: true },
  })
  return NextResponse.json({ runs })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { bsMonth, employeeId } = body

  if (!bsMonth || !employeeId) {
    return NextResponse.json({ error: 'bsMonth and employeeId required' }, { status: 400 })
  }

  const employee = await db.employee.findFirst({
    where: { id: employeeId, tenantId: DEMO_TENANT_ID },
  })
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const basic = Number(employee.basicSalary)
  const allowance = Number(employee.allowance)

  const ssf = calculateSsf(basic, allowance)
  const tds = calculateSalaryTds(basic, allowance)

  const fiscalYear = await db.fiscalYear.findFirst({
    where: {
      tenantId: DEMO_TENANT_ID,
      adStart: { lte: bsStringToAd(bsMonth + '-15') },
      adEnd: { gte: bsStringToAd(bsMonth + '-15') },
    },
  })

  // Replace existing run for this employee+month
  await db.payrollRun.deleteMany({
    where: { tenantId: DEMO_TENANT_ID, bsMonth, employeeId },
  })

  const run = await db.payrollRun.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      fiscalYearId: fiscalYear?.id,
      bsMonth,
      employeeId,
      basicSalary: basic,
      allowance,
      grossSalary: ssf.grossSalary,
      ssfEmployee: ssf.ssfEmployee,
      ssfEmployer: ssf.ssfEmployer,
      tds: tds.monthlyTax,
      otherDeduction: 0,
      netSalary: tds.netMonthlySalary,
      status: 'DRAFT',
    },
    include: { employee: true },
  })

  return NextResponse.json({
    payroll: run,
    computation: {
      ssf,
      tds,
      netPayable: tds.netMonthlySalary,
    },
  })
}

// Run payroll for all employees in a given month
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { bsMonth } = body
  if (!bsMonth) return NextResponse.json({ error: 'bsMonth required' }, { status: 400 })

  const employees = await db.employee.findMany({
    where: { tenantId: DEMO_TENANT_ID, status: 'ACTIVE' },
  })

  const results: any[] = []
  for (const emp of employees) {
    const basic = Number(emp.basicSalary)
    const allowance = Number(emp.allowance)
    const ssf = calculateSsf(basic, allowance)
    const tds = calculateSalaryTds(basic, allowance)

    const fiscalYear = await db.fiscalYear.findFirst({
      where: {
        tenantId: DEMO_TENANT_ID,
        adStart: { lte: bsStringToAd(bsMonth + '-15') },
        adEnd: { gte: bsStringToAd(bsMonth + '-15') },
      },
    })

    await db.payrollRun.deleteMany({
      where: { tenantId: DEMO_TENANT_ID, bsMonth, employeeId: emp.id },
    })

    const run = await db.payrollRun.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        fiscalYearId: fiscalYear?.id,
        bsMonth,
        employeeId: emp.id,
        basicSalary: basic,
        allowance,
        grossSalary: ssf.grossSalary,
        ssfEmployee: ssf.ssfEmployee,
        ssfEmployer: ssf.ssfEmployer,
        tds: tds.monthlyTax,
        otherDeduction: 0,
        netSalary: tds.netMonthlySalary,
        status: 'DRAFT',
      },
    })
    results.push({ employee: emp.name, netSalary: Number(run.netSalary), tds: Number(run.tds) })
  }

  return NextResponse.json({ count: results.length, results })
}
