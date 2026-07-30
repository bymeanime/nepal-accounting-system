// ============================================================
// Database initialization helper
// Ensures SQLite file exists and schema is pushed
// Used by /api/admin/seed to bootstrap a fresh Vercel deployment
// ============================================================

import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

let prismaClient: PrismaClient | null = null

/**
 * Get a Prisma client. On first call, ensures the SQLite DB file exists
 * (creates an empty file if missing) so queries don't fail.
 */
export async function getDb(): Promise<PrismaClient> {
  if (prismaClient) return prismaClient

  const dbUrl = process.env.DATABASE_URL || 'file:/tmp/nepal-acct.db'

  // If SQLite, ensure parent directory exists and file is touchable
  if (dbUrl.startsWith('file:')) {
    const filePath = dbUrl.replace('file:', '')
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '')
    }
  }

  prismaClient = new PrismaClient()
  return prismaClient
}

/**
 * Run prisma db push to ensure schema is applied.
 * Used by /api/admin/seed before seeding.
 */
export async function ensureSchema(): Promise<{ success: boolean; message: string }> {
  try {
    // Use the bundled prisma CLI
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss --skip-generate', {
      cwd: process.cwd(),
      timeout: 60000,
    })
    return {
      success: true,
      message: `Schema pushed successfully. ${stdout.slice(-200)}`,
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Schema push failed: ${err.message}`,
    }
  }
}

/**
 * Check if the database has any data (used to decide if seeding is needed).
 */
export async function isDatabaseEmpty(): Promise<boolean> {
  const db = await getDb()
  try {
    const count = await db.tenant.count()
    return count === 0
  } catch {
    // If table doesn't exist, schema needs to be pushed first
    return true
  }
}
