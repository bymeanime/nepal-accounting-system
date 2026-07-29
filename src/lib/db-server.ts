// ============================================================
// Server-only DB initialization (Node.js fs/path)
// Strategy for Vercel serverless:
//   1. The pre-seeded SQLite DB is bundled at db/nepal-acct-seeded.db
//   2. On first request, copy it to /tmp/nepal-acct.db (writable on Vercel)
//   3. Subsequent requests reuse the /tmp DB (within the same warm instance)
// ============================================================

import fs from 'fs'
import path from 'path'

const TMP_DB_PATH = '/tmp/nepal-acct.db'

function findSeededDb(): string | null {
  // Try multiple paths — Vercel serverless cwd may differ
  const candidates = [
    path.join(process.cwd(), 'db', 'nepal-acct-seeded.db'),
    path.join(__dirname, '..', '..', '..', 'db', 'nepal-acct-seeded.db'),
    path.join(__dirname, '..', 'db', 'nepal-acct-seeded.db'),
    '/var/task/db/nepal-acct-seeded.db',
    './db/nepal-acct-seeded.db',
  ]

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate
      }
    } catch {}
  }
  return null
}

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
        const seedSource = findSeededDb()
        if (seedSource) {
          fs.copyFileSync(seedSource, filePath)
          console.log(`[db-server] Copied seeded DB from ${seedSource} to ${filePath}`)
        } else {
          // No seed available — create empty file
          fs.writeFileSync(filePath, '')
          console.warn(`[db-server] No seed DB found. Created empty file at ${filePath}. Searched: ${[
            path.join(process.cwd(), 'db', 'nepal-acct-seeded.db'),
            path.join(__dirname, '..', '..', '..', 'db', 'nepal-acct-seeded.db'),
            '/var/task/db/nepal-acct-seeded.db',
          ].join(', ')}`)
        }
      }
    } catch (err) {
      console.warn('[db-server] Could not ensure DB file:', (err as Error).message)
    }
  }
}

// Auto-run on import (server-side only)
ensureDbFile()
