// ============================================================
// Seed demo inventory items, stock movements, and fixed assets
// ============================================================

import { db } from '../src/lib/db'
import { adToBsString, bsStringToAd } from '../src/lib/nepaliCalendar'

const DEMO_TENANT_ID = 'demo-tenant'

async function main() {
  console.log('🌱 Seeding inventory items + fixed assets...')

  // 1. Create items
  await db.item.deleteMany({ where: { tenantId: DEMO_TENANT_ID } })

  const items = [
    { sku: 'TG-001', name: 'Trading Goods - Lot A', nameNp: 'व्यापार सामान - A', type: 'GOODS', unit: 'PCS', valuationMethod: 'WEIGHTED_AVG', salePrice: 5000, purchasePrice: 4000, vatRate: 13, hsnCode: '3926.10', reorderLevel: 5, openingStock: 20, openingValue: 80000 },
    { sku: 'TG-002', name: 'Trading Goods - Lot B', nameNp: 'व्यापार सामान - B', type: 'GOODS', unit: 'PCS', valuationMethod: 'WEIGHTED_AVG', salePrice: 10000, purchasePrice: 8000, vatRate: 13, hsnCode: '3926.20', reorderLevel: 3, openingStock: 15, openingValue: 120000 },
    { sku: 'ST-001', name: 'Stationery Pack', nameNp: 'स्टेशनरी प्याक', type: 'GOODS', unit: 'BOX', valuationMethod: 'FIFO', salePrice: 1500, purchasePrice: 1000, vatRate: 13, hsnCode: '4820.10', reorderLevel: 10, openingStock: 50, openingValue: 50000 },
    { sku: 'SV-001', name: 'Consulting Service', nameNp: 'परामर्श सेवा', type: 'SERVICE', unit: 'HOUR', valuationMethod: 'WEIGHTED_AVG', salePrice: 2000, purchasePrice: 0, vatRate: 13, reorderLevel: 0, openingStock: 0, openingValue: 0 },
    { sku: 'EV-001', name: 'Office Laptop (Dell)', nameNp: 'ल्यापटप', type: 'GOODS', unit: 'PCS', valuationMethod: 'SPECIFIC', salePrice: 75000, purchasePrice: 60000, vatRate: 13, hsnCode: '8471.30', reorderLevel: 2, openingStock: 3, openingValue: 180000 },
  ]

  for (const item of items) {
    const created = await db.item.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        sku: item.sku,
        name: item.name,
        nameNp: item.nameNp,
        type: item.type as 'GOODS' | 'SERVICE',
        unit: item.unit,
        valuationMethod: item.valuationMethod as 'FIFO' | 'WEIGHTED_AVG' | 'SPECIFIC',
        salePrice: item.salePrice,
        purchasePrice: item.purchasePrice,
        vatRate: item.vatRate,
        vatExempt: false,
        hsnCode: item.hsnCode,
        reorderLevel: item.reorderLevel,
        openingStock: item.openingStock,
        openingValue: item.openingValue,
      },
    })

    // Create opening stock movement
    if (item.openingStock > 0) {
      await db.inventoryMovement.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          itemId: created.id,
          type: 'OPENING',
          quantity: item.openingStock,
          rate: item.openingValue / item.openingStock,
          value: item.openingValue,
          refType: 'OPENING',
          bsDate: '2082-04-01',
          adDate: bsStringToAd('2082-04-01'),
          notes: 'Opening stock at FY start',
        },
      })
    }
  }
  console.log(`✅ ${items.length} inventory items seeded with opening stock`)

  // 2. Add some stock movements (IN/OUT) for the year
  const tg001 = await db.item.findFirst({ where: { tenantId: DEMO_TENANT_ID, sku: 'TG-001' } })
  const tg002 = await db.item.findFirst({ where: { tenantId: DEMO_TENANT_ID, sku: 'TG-002' } })

  if (tg001) {
    // IN: purchased more stock on Bhadra 15, 2082
    await db.inventoryMovement.create({
      data: {
        tenantId: DEMO_TENANT_ID, itemId: tg001.id, type: 'IN',
        quantity: 10, rate: 4200, value: 42000,
        refType: 'PURCHASE', bsDate: '2082-05-15', adDate: bsStringToAd('2082-05-15'),
        notes: 'Restock purchase',
      },
    })
    // OUT: sold stock on Kartik 5, 2082
    await db.inventoryMovement.create({
      data: {
        tenantId: DEMO_TENANT_ID, itemId: tg001.id, type: 'OUT',
        quantity: -10, rate: 4100, value: 41000,
        refType: 'INVOICE', bsDate: '2082-07-05', adDate: bsStringToAd('2082-07-05'),
        notes: 'Sold to Annapurna',
      },
    })
  }

  if (tg002) {
    await db.inventoryMovement.create({
      data: {
        tenantId: DEMO_TENANT_ID, itemId: tg002.id, type: 'IN',
        quantity: 5, rate: 8200, value: 41000,
        refType: 'PURCHASE', bsDate: '2082-08-20', adDate: bsStringToAd('2082-08-20'),
        notes: 'Restock purchase',
      },
    })
    await db.inventoryMovement.create({
      data: {
        tenantId: DEMO_TENANT_ID, itemId: tg002.id, type: 'OUT',
        quantity: -8, rate: 8000, value: 64000,
        refType: 'INVOICE', bsDate: '2082-07-15', adDate: bsStringToAd('2082-07-15'),
        notes: 'Sold to Annapurna',
      },
    })
  }
  console.log('✅ Stock movements (IN/OUT) seeded')

  // 3. Fixed Assets
  await db.fixedAsset.deleteMany({ where: { tenantId: DEMO_TENANT_ID } })

  const assets = [
    { assetCode: 'FA-001', name: 'Office Building (Kathmandu)', category: 'BUILDING_FACTORY', acquisitionBsDate: '2075-01-15', cost: 5000000, salvageValue: 500000, depMethod: 'SLM', depRate: 10, location: 'Kathmandu-11' },
    { assetCode: 'FA-002', name: 'Delivery Van (Toyota)', category: 'VEHICLE', acquisitionBsDate: '2078-07-01', cost: 2500000, salvageValue: 250000, depMethod: 'WDV', depRate: 20, location: 'Warehouse' },
    { assetCode: 'FA-003', name: 'Office Computers (5 units)', category: 'IT_EQUIPMENT', acquisitionBsDate: '2080-04-01', cost: 500000, salvageValue: 50000, depMethod: 'WDV', depRate: 25, location: 'Office' },
    { assetCode: 'FA-004', name: 'Office Furniture', category: 'FURNITURE_FIXTURES', acquisitionBsDate: '2079-04-01', cost: 300000, salvageValue: 30000, depMethod: 'WDV', depRate: 12.5, location: 'Office' },
    { assetCode: 'FA-005', name: 'Machinery - Packaging Unit', category: 'PLANT_MACHINERY', acquisitionBsDate: '2077-10-15', cost: 1500000, salvageValue: 150000, depMethod: 'WDV', depRate: 15, location: 'Production Floor' },
  ]

  for (const a of assets) {
    const adDate = bsStringToAd(a.acquisitionBsDate)
    await db.fixedAsset.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        assetCode: a.assetCode,
        name: a.name,
        category: a.category,
        acquisitionBsDate: a.acquisitionBsDate,
        acquisitionAdDate: adDate,
        cost: a.cost,
        salvageValue: a.salvageValue,
        usefulLifeYears: Math.ceil(100 / a.depRate),
        depMethod: a.depMethod as 'WDV' | 'SLM',
        depRate: a.depRate,
        accumulatedDep: 0,
        location: a.location,
        status: 'ACTIVE',
      },
    })
  }
  console.log(`✅ ${assets.length} fixed assets registered`)

  // 4. Compute total book value summary
  const allItems = await db.item.findMany({ where: { tenantId: DEMO_TENANT_ID } })
  let totalStockValue = 0
  for (const item of allItems) {
    const movements = await db.inventoryMovement.findMany({ where: { tenantId: DEMO_TENANT_ID, itemId: item.id } })
    let qty = Number(item.openingStock), val = Number(item.openingValue)
    for (const m of movements) {
      if (m.type === 'IN' || m.type === 'OPENING') { qty += Number(m.quantity); val += Number(m.value) }
      else if (m.type === 'OUT') { const avg = qty > 0 ? val / qty : Number(item.purchasePrice); qty += Number(m.quantity); val += avg * Number(m.quantity) }
    }
    totalStockValue += val
  }
  console.log(`📊 Total stock value: NPR ${totalStockValue.toLocaleString('en-IN')}`)

  console.log('\n🎉 Inventory + Fixed Assets seeding complete!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
