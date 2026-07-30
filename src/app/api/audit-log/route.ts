// ============================================================
// API: Audit Log
// GET /api/audit-log — list all audit entries
// GET /api/audit-log?entityType=INVOICE — filter by entity type
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import '@/lib/db-server'
import { isSchemaInitialized, initializeSchema } from '@/lib/schema-init'

const DEMO_TENANT_ID = 'demo-tenant'

async function ensureSchema() {
  const ready = await isSchemaInitialized()
  if (!ready) await initializeSchema()
}

export async function GET(req: NextRequest) {
  try {
    await ensureSchema()
    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('entityType')
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    const where: any = { tenantId: DEMO_TENANT_ID }
    if (entityType) where.entityType = entityType

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
      include: { user: { select: { name: true, email: true } } },
    })

    return NextResponse.json({
      logs: logs.map(l => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        beforeData: l.beforeData ? JSON.parse(l.beforeData) : null,
        afterData: l.afterData ? JSON.parse(l.afterData) : null,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        user: l.user?.name || l.user?.email || 'system',
        createdAt: l.createdAt,
      })),
      count: logs.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to load audit log', detail: err.message }, { status: 500 })
  }
}

/**
 * Helper to write audit log entries from other API routes.
 * Import this function and call it after any mutation.
 */
export async function writeAuditLog(params: {
  tenantId: string
  userId?: string | null
  action: string  // CREATE | UPDATE | DELETE | POST | CANCEL | REVERSE
  entityType: string
  entityId: string
  beforeData?: any
  afterData?: any
}) {
  try {
    await db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        beforeData: params.beforeData ? JSON.stringify(params.beforeData) : null,
        afterData: params.afterData ? JSON.stringify(params.afterData) : null,
        createdAt: new Date(),
      },
    })
  } catch (err) {
    // Don't fail the main operation if audit log fails
    console.error('[audit-log] write error:', err)
  }
}
