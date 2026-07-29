// ============================================================
// API: Stock Movements
// GET  /api/stock-movements?itemId=xxx
// POST /api/stock-movements  (IN/OUT/ADJUSTMENT/TRANSFER)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adToBsString, bsStringToAd, isValidBsDate } from '@/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')
  const limit = parseInt(searchParams.get('limit') || '100', 10)

  const where: any = { tenantId: DEMO_TENANT_ID }
  if (itemId) where.itemId = itemId

  const movements = await db.inventoryMovement.findMany({
    where,
    orderBy: { adDate: 'desc' },
    take: limit,
    include: { item: true },
  })

  return NextResponse.json({
    movements: movements.map(m => ({
      ...m,
      quantity: Number(m.quantity),
      rate: Number(m.rate),
      value: Number(m.value),
    })),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { itemId, type, quantity, rate, bsDate, notes, refType, refId } = body

  if (!itemId || !type || !quantity) {
    return NextResponse.json({ error: 'itemId, type, quantity required' }, { status: 400 })
  }

  if (!['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type. Must be IN, OUT, TRANSFER, or ADJUSTMENT' }, { status: 400 })
  }

  const effectiveBsDate = bsDate && isValidBsDate(bsDate) ? bsDate : adToBsString(new Date())
  const adDate = bsStringToAd(effectiveBsDate)

  const item = await db.item.findFirst({ where: { id: itemId, tenantId: DEMO_TENANT_ID } })
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  // For OUT movements, quantity must be positive but we record as negative
  const signedQty = type === 'OUT' ? -Math.abs(Number(quantity)) : Number(quantity)
  const absQty = Math.abs(Number(quantity))
  const effectiveRate = Number(rate || (type === 'IN' ? item.purchasePrice : item.salePrice))
  const value = absQty * effectiveRate

  const movement = await db.inventoryMovement.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      itemId,
      type,
      quantity: signedQty,
      rate: effectiveRate,
      value,
      refType: refType || 'VOUCHER',
      refId,
      bsDate: effectiveBsDate,
      adDate,
      notes,
    },
    include: { item: true },
  })

  return NextResponse.json({
    movement: {
      ...movement,
      quantity: Number(movement.quantity),
      rate: Number(movement.rate),
      value: Number(movement.value),
    },
  })
}
