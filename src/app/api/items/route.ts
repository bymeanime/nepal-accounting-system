// ============================================================
// API: Items (products/services) + Inventory summary
// GET  /api/items
// POST /api/items
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEMO_TENANT_ID = 'demo-tenant'

export async function GET() {
  const items = await db.item.findMany({
    where: { tenantId: DEMO_TENANT_ID },
    orderBy: { sku: 'asc' },
  })

  // Compute current stock for each item from movements
  const itemsWithStock = await Promise.all(items.map(async (item) => {
    const movements = await db.inventoryMovement.findMany({
      where: { tenantId: DEMO_TENANT_ID, itemId: item.id },
    })
    let quantity = Number(item.openingStock)
    let value = Number(item.openingValue)
    for (const m of movements) {
      if (m.type === 'IN' || m.type === 'OPENING') {
        quantity += Number(m.quantity)
        value += Number(m.value)
      } else if (m.type === 'OUT') {
        const avgCost = quantity > 0 ? value / quantity : Number(item.purchasePrice)
        const movedQty = Number(m.quantity)
        quantity -= movedQty
        value -= avgCost * movedQty
      } else if (m.type === 'ADJUSTMENT') {
        quantity += Number(m.quantity)
        value += Number(m.value)
      }
    }
    return {
      ...item,
      stockQuantity: quantity,
      stockValue: value,
      salePrice: Number(item.salePrice),
      purchasePrice: Number(item.purchasePrice),
      vatRate: Number(item.vatRate),
    }
  }))

  return NextResponse.json({ items: itemsWithStock })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    sku, name, nameNp, type, unit, valuationMethod,
    salePrice, purchasePrice, vatRate, vatExempt,
    hsnCode, reorderLevel, openingStock, openingValue,
  } = body

  if (!sku || !name) {
    return NextResponse.json({ error: 'SKU and Name required' }, { status: 400 })
  }

  const created = await db.item.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      sku,
      name,
      nameNp,
      type: type || 'GOODS',
      unit: unit || 'PCS',
      valuationMethod: valuationMethod || 'WEIGHTED_AVG',
      salePrice: salePrice || 0,
      purchasePrice: purchasePrice || 0,
      vatRate: vatRate ?? 13,
      vatExempt: vatExempt ?? false,
      hsnCode,
      reorderLevel: reorderLevel || 0,
      openingStock: openingStock || 0,
      openingValue: openingValue || 0,
    },
  })

  // Record opening stock as an inventory movement
  if ((openingStock || 0) > 0) {
    await db.inventoryMovement.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        itemId: created.id,
        type: 'OPENING',
        quantity: Number(openingStock),
        rate: openingStock > 0 ? Number(openingValue) / Number(openingStock) : 0,
        value: Number(openingValue),
        refType: 'OPENING',
        bsDate: new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(0, 4) + '-04-01',
        adDate: new Date(),
        notes: 'Opening stock',
      },
    })
  }

  return NextResponse.json({ item: created })
}
