# 🇳🇵 Nepal Accounting System

A production-ready, multi-tenant SaaS accounting platform built specifically for Nepali businesses. Features full Bikram Sambat (BS) calendar support, IRD-compliant VAT/TDS handling, NFRS-compliant financial statements, and bilingual UI (English + Nepali Devanagari).

Built with **Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Prisma**.

---

## ✨ Features

### Core Accounting
- **Double-entry bookkeeping** with auto-posting vouchers (Dr/Cr validation)
- **Chart of Accounts** — pre-seeded 60+ Nepal Schedule V accounts (English + Devanagari)
- **General Ledger, Trial Balance** (verified debit = credit)
- **Multi-currency** with live NRB (Nepal Rastra Bank) FX rate feed
- **Fiscal Year** auto-resolution (Shrawan 1 → Asar end)

### Transactions
- **Sales Invoices** — VAT-compliant Tax Invoice, Abbreviated, Export, Exempt types
- **Purchase Bills** — auto TDS deduction per Section 88 of Income Tax Act
- **Journal Vouchers** — Receipt, Payment, Contra, Journal types
- **Customer/Supplier Master** with PAN, TDS section mapping, credit limits

### Inventory
- **Items** — Goods/Services, FIFO/Weighted Avg/Specific valuation
- **Stock Movements** — IN/OUT/ADJUSTMENT/TRANSFER
- **Low-stock alerts** with reorder levels
- **HSN code** support for customs/VAT

### Fixed Assets
- **Asset Register** with WDV (Written Down Value) and SLM (Straight Line) depreciation
- **Auto-depreciation posting** — one-click creates a journal voucher
- **Income Tax Act rates** pre-configured:
  - Building: 5-10% SLM
  - Plant & Machinery: 15% WDV
  - Vehicle: 20% WDV
  - IT Equipment: 25% WDV
  - Furniture: 12.5% WDV

### Tax Compliance (IRD Nepal)
- **VAT Return (Form V48)** — monthly computation with Sales/Purchase VAT books
- **TDS Module** — 17 sections (rent, interest, contract, royalty, commission, etc.)
- **SSF (Social Security Fund)** — auto 11% employee + 20% employer = 31% of basic
- **Payroll** — auto TDS on salary per FY 2083/84 slabs (top rate 29%)
- **Configurable Tax Rules** — Finance Act changes (every Shrawan 1) need no code changes

### Financial Statements (NFRS-Compliant)
- **Profit & Loss** — Operating/Non-operating income, COGS, Admin/Selling/Financial/Tax expenses
- **Balance Sheet** — Schedule V format with retained earnings auto-adjustment
- **Trial Balance** — as-of any BS date with balance verification

### Multi-Tenant
- **Multiple companies** under one account (ideal for chartered accountants)
- Per-tenant: chart of accounts, fiscal year, tax rules, parties, vouchers
- Adding a new company auto-seeds the Nepal COA + current FY

### Export & Localization
- **PDF Exports** — VAT-compliant invoices, Form V48 VAT returns, financial statements
- **Excel Exports** — Trial Balance, P&L, Balance Sheet
- **Bilingual UI** — toggle between English and Nepali Devanagari (नेपाली)
- **BS Calendar** — every date picker, voucher, report uses Bikram Sambat

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Server Actions) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| ORM | Prisma 6 |
| Database | SQLite (dev) → PostgreSQL (production) |
| Auth | NextAuth.js v4 (schema ready, multi-tenant) |
| State | Zustand, TanStack Query |
| PDF | jsPDF + jspdf-autotable |
| Excel | exceljs |
| Icons | Lucide |
| Notifications | Sonner |
| i18n | Custom React Context (English + Nepali) |

---

## 📁 Project Structure

```
├── prisma/
│   └── schema.prisma              # 18-model multi-tenant schema
├── src/
│   ├── lib/
│   │   ├── nepaliCalendar.ts      # BS↔AD conversion (BS 2000-2099)
│   │   ├── taxEngine.ts           # VAT/TDS/SSF/Income Tax rules
│   │   ├── exports.ts             # PDF/Excel generators
│   │   ├── fxRates.ts             # NRB API integration
│   │   ├── i18n.ts                # English/Nepali translations
│   │   ├── seedChartOfAccounts.ts # 60+ Nepal Schedule V accounts
│   │   └── format.ts              # NPR currency formatting
│   ├── app/
│   │   ├── api/                   # 19 API route directories
│   │   │   ├── dashboard/
│   │   │   ├── invoices/
│   │   │   ├── purchase-bills/
│   │   │   ├── vouchers/
│   │   │   ├── vat-return/
│   │   │   ├── trial-balance/
│   │   │   ├── profit-loss/
│   │   │   ├── balance-sheet/
│   │   │   ├── payroll/
│   │   │   ├── items/
│   │   │   ├── stock-movements/
│   │   │   ├── fixed-assets/
│   │   │   ├── depreciation/
│   │   │   ├── fx-rates/
│   │   │   ├── tenants/
│   │   │   ├── export/            # PDF + Excel exports
│   │   │   └── calendar/
│   │   ├── page.tsx               # 17-view dashboard
│   │   └── layout.tsx
│   └── components/
│       ├── accounting/
│       │   ├── sidebar.tsx        # Bilingual nav
│       │   ├── i18n-provider.tsx
│       │   └── views/             # 17 view components
│       └── ui/                    # shadcn/ui components
├── scripts/
│   ├── seed.ts                    # Main DB seeder
│   ├── seed-demo-transactions.ts  # 10 demo vouchers
│   ├── seed-inventory-assets.ts   # 5 items + 5 fixed assets
│   └── seed-second-tenant.ts      # Multi-tenant demo
└── prisma/schema.prisma
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- A running PostgreSQL or SQLite instance

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/nepal-accounting-system.git
cd nepal-accounting-system

# Install dependencies
bun install   # or npm install

# Set up environment
cp .env.example .env
# Edit .env to point to your database

# Push Prisma schema to database
bun run db:push

# Seed demo data
bun run scripts/seed.ts
bun run scripts/seed-demo-transactions.ts
bun run scripts/seed-inventory-assets.ts
bun run scripts/seed-second-tenant.ts

# Start dev server
bun run dev
```

Open http://localhost:3000 to see the dashboard.

### Demo Login
- **Tenant**: Himal Trading Pvt. Ltd. (PAN: 601234567)
- **Today's date**: Ashar 27, 2083 BS
- **Fiscal Year**: 2082/83

---

## 🇳🇵 Nepal Tax Reference (FY 2083/84 — 2026/27)

### VAT
- Standard rate: **13%**
- Zero-rated: **0%** (exports)
- New reduced rate (FY 2083): **5%** (ride-sharing, specific categories)
- Registration threshold (goods): **NPR 5,000,000** annual turnover
- Registration threshold (services): **NPR 2,000,000**
- Filing: **Monthly** by 25th of following BS month

### Corporate Income Tax
- Normal business: **25%**
- Banks/Insurance/Telecom: **30%**
- Special industries (listed): **20%**
- Cottage/Agro/Priority: **5%** (time-bound)
- Non-resident: **25%**

### Personal Income Tax (FY 2083/84)
| Slab (Annual NPR) | Rate |
|---|---|
| 0 – 10,00,000 | 0% (exemption) |
| 10,00,001 – 20,00,000 | 10% |
| 20,00,001 – 30,00,000 | 20% |
| 30,00,001 – 40,00,000 | 25% |
| Above 40,00,000 | 29% (reduced from 39%) |

### TDS Sections (Section 88)
- Rent (resident): 10%
- Interest on deposit: 6%
- Contract payment (>NPR 50K): 1.5%
- Royalty: 15%
- Commission: 15%
- Dividend (resident): 5%
- Windfall gain (>NPR 50K): 25%
- + 10 more sections

### Social Security Fund (SSF)
- Employee: **11%** of basic salary
- Employer: **20%** of basic salary (8.33% gratuity + 1.67% additional + sub-components)
- **Total: 31%** of basic salary
- Mandatory for organized employers since FY 2076/77

---

## 🗓 Nepali Calendar (Bikram Sambat)

The system uses a static lookup table for BS years **2000–2099** (covers all realistic business data).

- BS calendar is ~56 years, 8.5 months ahead of Gregorian (AD)
- 12 months: Baisakh, Jestha, Ashar, Shrawan, Bhadra, Ashwin, Kartik, Mangsir, Poush, Magh, Falgun, Chaitra
- Nepali fiscal year: **Shrawan 1 → Asar end** (mid-July → mid-July)
- All dates stored as ISO (AD) in DB for portability; displayed as BS in UI

---

## 📊 Demo Data

The seeders create a realistic demo environment:

**Himal Trading Pvt. Ltd.** (active tenant)
- 60+ chart of accounts (Schedule V)
- 5 customers + suppliers (with PAN, TDS sections)
- 1 employee (Ram Bahadur, basic Rs 35,000)
- 5 inventory items with stock movements
- 5 fixed assets (Building, Van, Computers, Furniture, Machinery)
- 10 demo vouchers across FY 2082/83
- 25+ tax rules (VAT + 17 TDS sections + SSF + Income Tax)

**Sagarmatha Digital Services** (second tenant — for multi-tenant demo)
- Pre-seeded chart of accounts + fiscal year
- 2 demo parties

---

## 🔐 Production Deployment

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@host:5432/nepal_acct
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://yourdomain.com
```

### Recommended Stack
- **Database**: PostgreSQL 16+ with Row-Level Security for true multi-tenant isolation
- **Hosting**: Vercel (Next.js native) or self-host on a Nepal data center for data residency
- **Auth**: NextAuth.js with email/password + 2FA for accountants
- **File Storage**: Cloudflare R2 or S3 for invoice attachments
- **Background Jobs**: Inngest or BullMQ for monthly VAT reminders
- **Monitoring**: Sentry + PostHog + Better Stack

---

## 🛣 Roadmap

### Phase 1 (Complete ✅)
Core accounting, BS calendar, tax engine, dashboard, sales/purchase, VAT return, payroll, financial statements

### Phase 2 (Complete ✅)
PDF/Excel exports, bilingual UI, inventory, fixed assets with depreciation, multi-currency (NRB), multi-tenant

### Phase 3 (Planned)
- [ ] React Native/Expo mobile app (Khata mode for shopkeepers)
- [ ] eSewa/Khalti/FonePay payment links on invoices
- [ ] OCR bill capture for purchase bills
- [ ] Direct IRD Taxpayer Portal API integration
- [ ] NextAuth.js authentication with role-based access
- [ ] PostgreSQL migration with RLS
- [ ] Cost centers, project accounting
- [ ] Bank statement importers (Nabil, NIC Asia, Global IME)

---

## 📜 License

MIT License — see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Inland Revenue Department (IRD) Nepal** — tax rules and compliance framework
- **Nepal Rastra Bank (NRB)** — daily FX rates API
- **Accounting Standards Board (ASB) Nepal** — NFRS standards
- Built for Nepali businesses 🇳🇵
