// ============================================================
// API: Admin — Initialize database on Vercel deployment
// POST /api/admin/init?action=init  — Push schema only
// POST /api/admin/init?action=seed  — Push schema + run all seeders
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

async function ensureDbFile() {
  const dbUrl = process.env.DATABASE_URL || 'file:/tmp/nepal-acct.db'
  if (dbUrl.startsWith('file:')) {
    const filePath = dbUrl.replace('file:', '')
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '')
  }
}

async function runPrismaPush(): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss --skip-generate', {
      timeout: 60000,
      env: process.env,
    })
    return stdout + (stderr ? `\n${stderr}` : '')
  } catch (err: any) {
    throw new Error(`Prisma push failed: ${err.message}`)
  }
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const action = url.searchParams.get('action') || 'seed'

  const steps: string[] = []

  try {
    await ensureDbFile()
    steps.push('Database file ready')

    if (action === 'init' || action === 'seed') {
      const output = await runPrismaPush()
      steps.push('Schema pushed to database')
      if (output.includes('error')) {
        steps.push(`Schema push output: ${output.slice(-300)}`)
      }
    }

    if (action === 'seed') {
      const { runSeeders } = await import('@/lib/runtime-seeders')
      const result = await runSeeders()
      steps.push(`Seeders completed: ${result.tenantsCreated} tenants, ${result.accountsCreated} accounts, ${result.vouchersCreated} vouchers`)
      steps.push(`Demo tenant: ${result.demoTenantName}`)
      steps.push(`Demo login: ${result.demoEmail}`)
    }

    return NextResponse.json({
      success: true,
      action,
      steps,
      message: action === 'seed'
        ? 'Database initialized and seeded. Visit the dashboard to see demo data.'
        : 'Database schema initialized. Call /api/admin/init?action=seed to load demo data.',
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      action,
      steps,
      error: err.message,
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    endpoints: {
      init: 'POST /api/admin/init?action=init  — Push schema only',
      seed: 'POST /api/admin/init?action=seed  — Push schema + run all seeders',
    },
    note: 'For demo deployments only. Disable in production.',
  })
}
