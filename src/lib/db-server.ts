// ============================================================
// Server-only DB initialization (Node.js fs/path)
// Called only from API routes, never from client components
//
// Strategy for Vercel serverless:
// 1. The pre-seeded SQLite DB is bundled at db/nepal-acct-seeded.db
// 2. On first request, copy it to /tmp/nepal-acct.db (writable on Vercel)
// 3. Subsequent requests reuse the /tmp DB (within the same warm instance)
// 4. If /tmp DB doesn't exist (cold start), copy from bundled seed
// ============================================================

import fs from 'fs'
import path from 'path'

const SEEDED_DB_SOURCE = path.join(process.cwd(), 'db', 'nepal-acct-seeded.db')
const TMP_DB_PATH = '/tmp/nepal-acct.db'

export function ensureDbFile() {
  const dbUrl = process.env.DATABASE_URL || `file:${TMP_DB_PATH}`

  if (dbUrl.startsWith('file:')) {
    const filePath = dbUrl.replace('file:', '')
    const dir = path.dirname(filePath)

    try {
      // Ensure directory exists
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      // If DB file doesn't exist, try to copy from seeded source
      if (!fs.existsSync(filePath)) {
        if (fs.existsSync(SEEDED_DB_SOURCE)) {
          fs.copyFileSync(SEEDED_DB_SOURCE, filePath)
          console.log(`[db-server] Copied seeded DB from ${SEEDED_DB_SOURCE} to ${filePath}`)
        } else {
          // No seed available — create empty file (will need prisma db push)
          fs.writeFileSync(filePath, '')
          console.log(`[db-server] Created empty DB file at ${filePath}`)
        }
      }
    } catch (err) {
      console.warn('[db-server] Could not ensure DB file:', (err as Error).message)
    }
  }
}

// Auto-run on import (server-side only)
ensureDbFile()
