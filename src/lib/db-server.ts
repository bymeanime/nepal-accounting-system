// ============================================================
// Server-only DB initialization
// For PostgreSQL (Vercel Postgres / Neon), no file creation needed.
// For local dev (SQLite), creates the file if missing.
// ============================================================

import fs from 'fs'
import path from 'path'

export function ensureDbFile() {
  const dbUrl = process.env.DATABASE_URL || ''
  if (dbUrl.startsWith('file:')) {
    const filePath = dbUrl.replace('file:', '')
    const dir = path.dirname(filePath)
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '')
    } catch (err) {
      console.warn('[db-server] Could not ensure SQLite file:', (err as Error).message)
    }
  }
}

ensureDbFile()
