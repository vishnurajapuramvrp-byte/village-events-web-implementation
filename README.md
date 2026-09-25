# Village Events & Programs

Web ledger for village festival funds, donations, expenses, and repayable distributions. Built for **Vercel** (Next.js 14, NextAuth, Prisma). Money is stored as **integer paise**. Event balances are **always derived from transactions**, never typed in as an editable total.

This is a working Phase 1 app: Google or demo login, roles, events, donations, expenses, distributions with interest and due dates, reminder scheduling, PDF reports, people directory, and an audit log.

## Run locally

Copy `.env.example` to `.env`. Local development uses a fresh SQLite database (`file:./dev.db`) with Google login enabled and demo login disabled.

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The default seed creates only the Vishnu Raja Puram organization and village; add real events after signing in with Google.

For optional demo-only testing, set `ENABLE_DEMO_LOGIN="true"` and run `npm run db:seed:demo`. This resets the local database with demo accounts and sample ledger data.

On the Events screen, users with event-write permission can upload an `.xlsx` workbook. It must contain `Event Details`, `Donations`, and `Expenses` sheets; numbered names such as `1. Event Details` are also accepted. Matching events are updated by name and year, while donation and expense rows are imported into the event.


## Production on Vercel

The production schema is **PostgreSQL**. Vercel builds run `prisma generate`, `prisma migrate deploy`, then `next build`. Demo password accounts are **off** in production unless `ENABLE_DEMO_LOGIN=true`.

### 1. Database

Create Postgres (Vercel Storage → Postgres, [Neon](https://neon.tech), or [Supabase](https://supabase.com)). Copy:

| App variable | Typical provider name |
|---|---|
| `DATABASE_URL` | Pooled / Prisma URL (`POSTGRES_PRISMA_URL`, Neon `-pooler` host) |
| `DIRECT_URL` | Direct / non-pooled URL (`POSTGRES_URL_NON_POOLED`) |

If you only have one connection string, set **both** `DATABASE_URL` and `DIRECT_URL` to it.

If a deployment reports Prisma `P3009` for a failed migration, resolve that failed attempt once against the production database, then redeploy:

```bash
npx prisma migrate resolve --rolled-back 20260925220000_reminder_15_days --schema prisma/schema.prisma
npx prisma migrate deploy --schema prisma/schema.prisma
```

Run these commands only with production `DATABASE_URL` and `DIRECT_URL` loaded. The resolve command clears the failed migration marker; the deploy command then applies the corrected migration.

### 2. Google OAuth

1. Google Cloud → APIs & Services → Credentials → OAuth 2.0 Client (Web application).
2. Add these exact Authorized redirect URIs:
	- Local: `http://localhost:3000/api/auth/callback/google`
	- Production: `https://vrp-events.vercel.app/api/auth/callback/google` (also add any extra `*.vercel.app` URL).
3. Put the client ID and secret in Vercel env vars. Set `ADMIN_EMAIL` to the one Gmail that should be Admin. Other Gmail users sign in as Viewer until an Admin assigns a role.

### 3. Import the GitHub repo

Vercel → Add New → Project → import this repository. Framework preset: Next.js. Node.js **20.x** (from `package.json` / `.nvmrc`). Build command stays `npm run build`.

### 4. Environment variables (Production)

Generate secrets with `openssl rand -base64 32`.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled Postgres URL |
| `DIRECT_URL` | Yes | Direct Postgres URL (migrations) |
| `NEXTAUTH_URL` | No | Automatically uses `http://localhost:3000` locally or the Vercel deployment URL |
| `NEXTAUTH_SECRET` | Yes | Random 32+ byte secret |
| `GOOGLE_CLIENT_ID` | Yes in production | Google OAuth client (Gmail sign-in) |
| `GOOGLE_CLIENT_SECRET` | Yes in production | Google OAuth secret |
| `ADMIN_EMAIL` | Yes in production | One Gmail that becomes Admin on first sign-in |
| `ADMIN_EMAILS` | No | Extra Gmail admins, comma-separated |
| `VILLAGE_NAME` | No | Login badge and sidebar name (or edit `src/lib/site-config.ts`) |
| `VILLAGE_HEADLINE` | No | Bold headline on the login page |
| `VILLAGE_DESCRIPTION` | No | Village description under the headline |
| `CRON_SECRET` | Yes | Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` |
| `ENABLE_DEMO_LOGIN` | No | Default off in production; Gmail-only when unset |

Optional: `ORG_NAME`, `VILLAGE_NAME`, `VILLAGE_DISTRICT`, `VILLAGE_STATE` for the production seed.

### 5. Deploy, then seed the village

After the first successful deploy:

```bash
npx vercel env pull .env.production.local
npx dotenv -e .env.production.local -- npm run db:seed:prod
```

Or from any machine with `DATABASE_URL` and `DIRECT_URL` set to production:

```bash
npm run db:seed:prod
```

This creates the organization and village only (no demo users, no wipes). Sign in with a Google account listed in `ADMIN_EMAILS`. That user is promoted to Admin and attached to the village.

### 6. Confirm cron

Vercel dashboard → Project → Settings → Cron Jobs: `/api/cron/reminders` daily at 03:00 UTC. The job marks due reminders sent once and keeps the message generic.

Health check: `GET https://YOUR-DOMAIN/api/health`

## Financial rules

- Available before distribution = opening + donations − expenses
- Distributable balance = available − principal already distributed
- A distribution cannot exceed the current distributable balance
- Duplicate donation transaction references are rejected
- An event cannot close while distributions exceed available funds
- Default interest is annual simple: `Principal × Rate × (days ÷ 365)`
- Distribution due date defaults to start date + 1 year, with 30-day, 7-day, due-day, and overdue reminders

## API

Authenticated JSON routes mirror the UI: `GET/POST /api/events`, `GET /api/events/[id]`, `POST /api/events/[id]/donations|expenses|distributions`, `GET/POST /api/people`, `GET /api/reports/[id]/pdf`.

If this will be used for real-money lending, get local legal and accounting advice before production use.
