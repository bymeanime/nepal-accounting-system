// ============================================================
// Programmatic schema creation for Vercel serverless
// Creates all 18 Prisma tables using raw SQL (DDL statements)
// Used by /api/admin/init when the bundled DB approach fails
// ============================================================

import { db } from '@/lib/db'
import '@/lib/db-server'

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  passwordHash TEXT,
  image TEXT,
  emailVerified DATETIME,
  twoFactorEnabled BOOLEAN NOT NULL DEFAULT 0,
  preferredLanguage TEXT NOT NULL DEFAULT 'en',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS UserTenant (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  tenantId TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ACCOUNTANT',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  UNIQUE (userId, tenantId)
);

CREATE TABLE IF NOT EXISTS Session (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expiresAt DATETIME NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Tenant (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legalName TEXT,
  pan TEXT,
  vatNumber TEXT,
  exciseNumber TEXT,
  ssfNumber TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  municipality TEXT,
  district TEXT,
  province TEXT,
  baseCurrency TEXT NOT NULL DEFAULT 'NPR',
  fyStartBsMonth INTEGER NOT NULL DEFAULT 4,
  language TEXT NOT NULL DEFAULT 'en',
  logoUrl TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS FiscalYear (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  bsYearStart INTEGER NOT NULL,
  bsYearEnd INTEGER NOT NULL,
  adStart DATETIME NOT NULL,
  adEnd DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  closedAt DATETIME,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  UNIQUE (tenantId, bsYearStart)
);

CREATE TABLE IF NOT EXISTS Account (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  nameNp TEXT,
  type TEXT NOT NULL,
  subType TEXT,
  parentId TEXT,
  isGroup BOOLEAN NOT NULL DEFAULT 0,
  isCash BOOLEAN NOT NULL DEFAULT 0,
  isBank BOOLEAN NOT NULL DEFAULT 0,
  openingBalance REAL NOT NULL DEFAULT 0,
  description TEXT,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT 1,
  costCenter TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  FOREIGN KEY (parentId) REFERENCES Account(id),
  UNIQUE (tenantId, code)
);

CREATE TABLE IF NOT EXISTS CostCenter (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  name TEXT NOT NULL,
  nameNp TEXT,
  code TEXT,
  isActive BOOLEAN NOT NULL DEFAULT 1,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  UNIQUE (tenantId, code)
);

CREATE TABLE IF NOT EXISTS Party (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  name TEXT NOT NULL,
  nameNp TEXT,
  type TEXT NOT NULL,
  pan TEXT,
  vatNumber TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  municipality TEXT,
  district TEXT,
  creditLimit REAL,
  openingBalance REAL NOT NULL DEFAULT 0,
  tdsSection TEXT,
  isActive BOOLEAN NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  UNIQUE (tenantId, pan)
);

CREATE TABLE IF NOT EXISTS Item (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  nameNp TEXT,
  type TEXT NOT NULL DEFAULT 'GOODS',
  unit TEXT NOT NULL DEFAULT 'PCS',
  valuationMethod TEXT NOT NULL DEFAULT 'WEIGHTED_AVG',
  salePrice REAL NOT NULL DEFAULT 0,
  purchasePrice REAL NOT NULL DEFAULT 0,
  vatRate REAL NOT NULL DEFAULT 13,
  vatExempt BOOLEAN NOT NULL DEFAULT 0,
  hsnCode TEXT,
  reorderLevel REAL NOT NULL DEFAULT 0,
  openingStock REAL NOT NULL DEFAULT 0,
  openingValue REAL NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  UNIQUE (tenantId, sku)
);

CREATE TABLE IF NOT EXISTS Godown (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  name TEXT NOT NULL,
  nameNp TEXT,
  address TEXT,
  isActive BOOLEAN NOT NULL DEFAULT 1,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS InventoryMovement (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  itemId TEXT NOT NULL,
  godownId TEXT,
  type TEXT NOT NULL,
  quantity REAL NOT NULL,
  rate REAL NOT NULL,
  value REAL NOT NULL,
  refType TEXT,
  refId TEXT,
  bsDate TEXT NOT NULL,
  adDate DATETIME NOT NULL,
  notes TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (itemId) REFERENCES Item(id) ON DELETE CASCADE,
  FOREIGN KEY (godownId) REFERENCES Godown(id)
);

CREATE TABLE IF NOT EXISTS Voucher (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  fiscalYearId TEXT,
  voucherNo TEXT NOT NULL,
  voucherType TEXT NOT NULL DEFAULT 'JOURNAL',
  bsDate TEXT NOT NULL,
  adDate DATETIME NOT NULL,
  narration TEXT,
  refType TEXT,
  refId TEXT,
  totalDebit REAL NOT NULL DEFAULT 0,
  totalCredit REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  createdBy TEXT,
  approvedBy TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  FOREIGN KEY (fiscalYearId) REFERENCES FiscalYear(id),
  UNIQUE (tenantId, voucherNo)
);

CREATE TABLE IF NOT EXISTS VoucherLine (
  id TEXT PRIMARY KEY,
  voucherId TEXT NOT NULL,
  accountId TEXT NOT NULL,
  partyId TEXT,
  costCenter TEXT,
  debit REAL NOT NULL DEFAULT 0,
  credit REAL NOT NULL DEFAULT 0,
  description TEXT,
  FOREIGN KEY (voucherId) REFERENCES Voucher(id) ON DELETE CASCADE,
  FOREIGN KEY (accountId) REFERENCES Account(id),
  FOREIGN KEY (partyId) REFERENCES Party(id)
);

CREATE TABLE IF NOT EXISTS Invoice (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  fiscalYearId TEXT,
  invoiceNo TEXT NOT NULL,
  invoiceType TEXT NOT NULL DEFAULT 'TAX_INVOICE',
  bsDate TEXT NOT NULL,
  adDate DATETIME NOT NULL,
  partyId TEXT NOT NULL,
  panBuyer TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discountAmount REAL NOT NULL DEFAULT 0,
  taxableAmount REAL NOT NULL DEFAULT 0,
  vatAmount REAL NOT NULL DEFAULT 0,
  zeroRatedAmount REAL NOT NULL DEFAULT 0,
  exemptAmount REAL NOT NULL DEFAULT 0,
  totalAmount REAL NOT NULL DEFAULT 0,
  paidAmount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NPR',
  exchangeRate REAL NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'UNPAID',
  dueDate DATETIME,
  notes TEXT,
  qrData TEXT,
  createdBy TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  FOREIGN KEY (fiscalYearId) REFERENCES FiscalYear(id),
  FOREIGN KEY (partyId) REFERENCES Party(id),
  UNIQUE (tenantId, invoiceNo)
);

CREATE TABLE IF NOT EXISTS InvoiceLine (
  id TEXT PRIMARY KEY,
  invoiceId TEXT NOT NULL,
  itemId TEXT,
  description TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT,
  rate REAL NOT NULL DEFAULT 0,
  discountPct REAL NOT NULL DEFAULT 0,
  discountAmount REAL NOT NULL DEFAULT 0,
  taxableAmount REAL NOT NULL DEFAULT 0,
  vatRate REAL NOT NULL DEFAULT 13,
  vatAmount REAL NOT NULL DEFAULT 0,
  totalAmount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (invoiceId) REFERENCES Invoice(id) ON DELETE CASCADE,
  FOREIGN KEY (itemId) REFERENCES Item(id)
);

CREATE TABLE IF NOT EXISTS PurchaseBill (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  fiscalYearId TEXT,
  billNo TEXT NOT NULL,
  vendorBillNo TEXT,
  bsDate TEXT NOT NULL,
  adDate DATETIME NOT NULL,
  partyId TEXT NOT NULL,
  vendorPan TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discountAmount REAL NOT NULL DEFAULT 0,
  taxableAmount REAL NOT NULL DEFAULT 0,
  vatAmount REAL NOT NULL DEFAULT 0,
  exemptAmount REAL NOT NULL DEFAULT 0,
  totalAmount REAL NOT NULL DEFAULT 0,
  paidAmount REAL NOT NULL DEFAULT 0,
  tdsSection TEXT,
  tdsRate REAL NOT NULL DEFAULT 0,
  tdsAmount REAL NOT NULL DEFAULT 0,
  netPayable REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'UNPAID',
  dueDate DATETIME,
  notes TEXT,
  createdBy TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  FOREIGN KEY (fiscalYearId) REFERENCES FiscalYear(id),
  FOREIGN KEY (partyId) REFERENCES Party(id),
  UNIQUE (tenantId, billNo)
);

CREATE TABLE IF NOT EXISTS PurchaseLine (
  id TEXT PRIMARY KEY,
  purchaseBillId TEXT NOT NULL,
  itemId TEXT,
  description TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT,
  rate REAL NOT NULL DEFAULT 0,
  taxableAmount REAL NOT NULL DEFAULT 0,
  vatRate REAL NOT NULL DEFAULT 13,
  vatAmount REAL NOT NULL DEFAULT 0,
  totalAmount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (purchaseBillId) REFERENCES PurchaseBill(id) ON DELETE CASCADE,
  FOREIGN KEY (itemId) REFERENCES Item(id)
);

CREATE TABLE IF NOT EXISTS TaxRule (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  taxType TEXT NOT NULL,
  section TEXT,
  name TEXT NOT NULL,
  rate REAL NOT NULL DEFAULT 0,
  thresholdMin REAL NOT NULL DEFAULT 0,
  thresholdMax REAL,
  effectiveFromBs TEXT NOT NULL,
  effectiveToBs TEXT,
  appliesTo TEXT,
  condition TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS TaxReturn (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  fiscalYearId TEXT,
  returnPeriod TEXT NOT NULL,
  returnType TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  payload TEXT,
  totalTaxable REAL NOT NULL DEFAULT 0,
  totalTax REAL NOT NULL DEFAULT 0,
  filedAt DATETIME,
  filedBy TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  FOREIGN KEY (fiscalYearId) REFERENCES FiscalYear(id)
);

CREATE TABLE IF NOT EXISTS Employee (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  name TEXT NOT NULL,
  nameNp TEXT,
  pan TEXT,
  ssfNumber TEXT,
  citNumber TEXT,
  department TEXT,
  designation TEXT,
  joiningBsDate TEXT,
  basicSalary REAL NOT NULL DEFAULT 0,
  allowance REAL NOT NULL DEFAULT 0,
  grade TEXT,
  residency TEXT NOT NULL DEFAULT 'RESIDENT',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  phone TEXT,
  email TEXT,
  bankAccount TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PayrollRun (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  fiscalYearId TEXT,
  bsMonth TEXT NOT NULL,
  employeeId TEXT NOT NULL,
  basicSalary REAL NOT NULL DEFAULT 0,
  allowance REAL NOT NULL DEFAULT 0,
  grossSalary REAL NOT NULL DEFAULT 0,
  ssfEmployee REAL NOT NULL DEFAULT 0,
  ssfEmployer REAL NOT NULL DEFAULT 0,
  citEmployee REAL NOT NULL DEFAULT 0,
  tds REAL NOT NULL DEFAULT 0,
  otherDeduction REAL NOT NULL DEFAULT 0,
  netSalary REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  paidAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  FOREIGN KEY (fiscalYearId) REFERENCES FiscalYear(id),
  FOREIGN KEY (employeeId) REFERENCES Employee(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS FixedAsset (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  assetCode TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  acquisitionBsDate TEXT NOT NULL,
  acquisitionAdDate DATETIME NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  salvageValue REAL NOT NULL DEFAULT 0,
  usefulLifeYears INTEGER NOT NULL DEFAULT 5,
  depMethod TEXT NOT NULL DEFAULT 'WDV',
  depRate REAL NOT NULL DEFAULT 0,
  accumulatedDep REAL NOT NULL DEFAULT 0,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Document (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  fileName TEXT NOT NULL,
  fileUrl TEXT NOT NULL,
  fileSize INTEGER,
  mimeType TEXT,
  uploadedBy TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AuditLog (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  userId TEXT,
  action TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  beforeData TEXT,
  afterData TEXT,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES User(id)
);
`

/**
 * Initialize the database schema by running all CREATE TABLE IF NOT EXISTS statements.
 * Safe to call multiple times — uses IF NOT EXISTS.
 */
export async function initializeSchema(): Promise<{ success: boolean; message: string; tablesCreated: number }> {
  try {
    // Split SQL by semicolons and execute each statement
    const statements = SCHEMA_SQL.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'))
    let executed = 0
    for (const stmt of statements) {
      try {
        await db.$executeRawUnsafe(stmt)
        executed++
      } catch (err: any) {
        // SQLite returns "table already exists" only without IF NOT EXISTS; we use IF NOT EXISTS so this should rarely fire
        if (!err.message.includes('already exists')) {
          console.warn('Schema statement failed:', err.message, 'for statement:', stmt.slice(0, 80))
        }
      }
    }
    return {
      success: true,
      message: `Schema initialized. ${executed} CREATE TABLE statements executed.`,
      tablesCreated: executed,
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Schema init failed: ${err.message}`,
      tablesCreated: 0,
    }
  }
}

/**
 * Check if database has any tables (used to decide if init is needed).
 */
export async function isSchemaInitialized(): Promise<boolean> {
  try {
    const result: any = await db.$queryRaw`SELECT count(*) as count FROM sqlite_master WHERE type='table'`
    return Number(result?.[0]?.count || 0) > 0
  } catch {
    return false
  }
}
