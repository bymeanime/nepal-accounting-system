// ============================================================
// Prisma client with auto-creation of SQLite file for Vercel
// On first import, ensures the DB file exists so queries don't fail.
// ============================================================

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function ensureDbFile() {
  const dbUrl = process.env.DATABASE_URL || 'file:/tmp/nepal-acct.db'
  if (dbUrl.startsWith('file:')) {
    const filePath = dbUrl.replace('file:', '')
    const dir = path.dirname(filePath)
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '')
    } catch (err) {
      // If we can't create the file (e.g., read-only fs), let Prisma throw the proper error
      console.warn('Could not pre-create SQLite file:', (err as Error).message)
    }
  }
}

ensureDbFile()

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
