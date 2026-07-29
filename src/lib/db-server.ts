// ============================================================
// Server-only DB initialization (Node.js fs/path)
// Called only from API routes, never from client components
// ============================================================

import fs from 'fs'
import path from 'path'

export function ensureDbFile() {
  const dbUrl = process.env.DATABASE_URL || 'file:/tmp/nepal-acct.db'
  if (dbUrl.startsWith('file:')) {
    const filePath = dbUrl.replace('file:', '')
    const dir = path.dirname(filePath)
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '')
    } catch (err) {
      console.warn('Could not pre-create SQLite file:', (err as Error).message)
    }
  }
}

// Auto-run on import (server-side only)
ensureDbFile()
