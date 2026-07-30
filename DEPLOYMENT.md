# 🚀 Deployment Guide

This guide covers deploying the Nepal Accounting System to Vercel (recommended), along with alternative self-hosted options.

---

## Option A: Vercel Dashboard Import (Recommended — 2 minutes)

The fastest path to a live deployment.

### Steps

1. **Go to Vercel**: https://vercel.com/new
2. **Import the GitHub repo**: `bymeanime/nepal-accounting-system`
3. **Configure project**:
   - Framework Preset: **Next.js** (auto-detected)
   - Build Command: `bun run build` (or leave default — Vercel auto-detects)
   - Install Command: `bun install` (or leave default)
   - Output Directory: `.next` (auto-detected)
4. **Set Environment Variables**:
   - `DATABASE_URL` = `file:/tmp/nepal-acct.db` (for demo SQLite)
   - Or use a real PostgreSQL URL: `postgresql://user:pass@host:5432/nepal_acct`
5. **Click "Deploy"** — Vercel will build and deploy in ~2 minutes
6. **Once deployed**, your site is live at `https://nepal-accounting-system.vercel.app` (or similar)

### Important Notes

- **Database**: The default SQLite setup will work for demo, but each deployment creates a fresh DB. For persistent data:
  - Use Vercel Postgres (free tier)
  - Or Neon, Supabase, or any external PostgreSQL
- **Seeding**: After the first deployment, run the seed script once. See [Seeding Production](#seeding-production) below.

---

## Option B: Vercel CLI Deployment

### Prerequisites
- Vercel account
- Vercel CLI installed: `npm install -g vercel`

### Steps

```bash
# Login (one-time — opens browser)
vercel login

# From project root
cd nepal-accounting-system

# Deploy to staging (preview URL)
vercel

# Add environment variables
vercel env add DATABASE_URL
# (paste your database URL when prompted)

# Deploy to production
vercel --prod
```

### Get your Vercel tokens for GitHub Actions (optional auto-deploy)

If you want pushes to `main` to auto-deploy:

1. **Get tokens**:
   - Go to https://vercel.com/account/tokens
   - Create a token with scope `Full Access`
   - Copy it

2. **Get Project ID and Org ID**:
   - After linking the project locally with `vercel link`, look at `.vercel/project.json`
   - Note `projectId` and `orgId`

3. **Add GitHub secrets** to https://github.com/bymeanime/nepal-accounting-system/settings/secrets/actions:
   - `VERCEL_TOKEN` = your Vercel API token
   - `VERCEL_PROJECT_ID` = projectId from .vercel/project.json
   - `VERCEL_ORG_ID` = orgId from .vercel/project.json

4. The included GitHub Action (`.github/workflows/deploy.yml`) will auto-deploy on every push to `main`.

---

## Seeding Production

After deployment, you need to seed the database with demo data. Two options:

### Option 1: Run locally against production DB

```bash
# Set DATABASE_URL to your production DB URL
export DATABASE_URL="your-production-postgresql-url"

# Run seeders
bun run db:push
bun run scripts/seed.ts
bun run scripts/seed-demo-transactions.ts
bun run scripts/seed-inventory-assets.ts
bun run scripts/seed-second-tenant.ts
```

### Option 2: Create an API route for seeding (for demo purposes only)

⚠️ **Never enable this in production** — but for demo deployments, you can temporarily add a `/api/admin/seed` endpoint that runs the seeders on demand. Remove it before going live with real users.

---

## Option C: Self-Hosted (Docker)

For data residency in Nepal or full control:

### Using Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/nepal_acct
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=nepal_acct
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
volumes:
  postgres_data:
```

### Dockerfile

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN bun run db:generate

# Build
RUN bun run build

# Expose port
EXPOSE 3000

# Start
CMD ["bun", "run", "start"]
```

Then run:
```bash
docker-compose up -d
```

---

## Production Checklist

Before going live with real users:

- [ ] **Database**: Migrate from SQLite to PostgreSQL
- [ ] **Authentication**: Enable NextAuth.js (schema is ready in Prisma)
- [ ] **Multi-tenant isolation**: Configure Postgres Row-Level Security
- [ ] **Environment variables**: Set `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL`
- [ ] **HTTPS**: Vercel handles automatically; self-hosted needs Let's Encrypt
- [ ] **Backups**: Configure daily DB backups with 7-year retention (Nepal ITA requirement)
- [ ] **Monitoring**: Add Sentry for errors, PostHog for analytics
- [ ] **Rate limiting**: Add to API routes (especially VAT/TDS computation endpoints)
- [ ] **Audit log**: Verify immutability of `AuditLog` table
- [ ] **File storage**: Configure Cloudflare R2 or S3 for invoice attachments
- [ ] **Email/SMS**: Set up Resend (email) + Sparrow SMS (Nepal SMS gateway)
- [ ] **IRD integration**: Apply for IRD Taxpayer Portal API access (when available)

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite path or PostgreSQL URL |
| `NEXTAUTH_SECRET` | For auth | Random 32+ char string |
| `NEXTAUTH_URL` | For auth | Your deployment URL |
| `NRB_FX_API_URL` | Optional | NRB FX rates API (fallback used if unreachable) |
| `IRD_API_BASE` | Future | IRD Taxpayer Portal API |
| `IRD_API_KEY` | Future | IRD API authentication |
| `RESEND_API_KEY` | Optional | Email service |
| `SPARROW_SMS_KEY` | Optional | Nepal SMS gateway |

---

## Deployment URLs

After deployment, your users can access:
- **Production**: `https://nepal-accounting-system.vercel.app` (or your custom domain)
- **Preview**: `https://nepal-accounting-system-git-main.vercel.app`
- **Pull request previews**: auto-generated by Vercel

---

## Troubleshooting

### Build fails with Prisma errors
- Ensure `DATABASE_URL` is set in Vercel environment variables
- The `postinstall` script runs `prisma generate` automatically

### Database not persisting on Vercel
- SQLite on Vercel is ephemeral — use Vercel Postgres or external DB
- See https://vercel.com/docs/storage for managed options

### Pages return 500 errors
- Check Vercel function logs: `vercel logs <deployment-url>`
- Common cause: missing environment variables

### QR code/PDF generation fails
- The libraries (`qrcode`, `jspdf`) work in serverless environments
- If timeouts occur, consider offloading to a background job (Inngest/BullMQ)
