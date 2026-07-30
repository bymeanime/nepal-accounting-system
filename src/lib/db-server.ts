// ============================================================
// Server-only DB initialization
//
// Vercel serverless has read-only filesystem except /tmp/.
// Strategy:
//   1. On first import, ensure /tmp/nepal-acct.db exists (create empty if missing)
//   2. The /api/admin/init endpoint programmatically creates tables
//      using raw SQL (DDL statements) via prisma.$executeRaw
//   3. Then seeds demo data via the runtime-seeders module
//
// This avoids needing to bundle a binary DB file (which Vercel's
// includeFiles doesn't reliably include in serverless function bundles).
// ============================================================

import fs from 'fs'
import path from 'path'

const TMP_DB_PATH = '/tmp/nepal-acct.db'

export function ensureDbFile() {
  const dbUrl = process.env.DATABASE_URL || `file:${TMP_DB_PATH}`

  if (dbUrl.startsWith('file:')) {
    const filePath = dbUrl.replace('file:', '')
    const dir = path.dirname(filePath)

    try {
      // Ensure directory exists
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      // Create empty file if missing (schema will be applied via SQL)
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '')
        console.log(`[db-server] Created empty DB file at ${filePath}`)
      }
    } catch (err) {
      console.warn('[db-server] Could not ensure DB file:', (err as Error).message)
    }
  }
}

// Auto-run on import (server-side only)
ensureDbFile()
