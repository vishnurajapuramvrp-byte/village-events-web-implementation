# Village Events & Programs

Web ledger for village festival funds, donations, expenses, and repayable distributions. Built for **Vercel** (Next.js 14, NextAuth, Prisma). Money is stored as **integer paise**. Event balances are **always derived from transactions**, never typed in as an editable total.

This is a working Phase 1 app: Google or demo login, roles, events, donations, expenses, distributions with interest and due dates, reminder scheduling, PDF reports, people directory, and an audit log.

## Run locally

Copy `.env.example` to `.env`. Local demo uses SQLite (`file:./dev.db`) so you can try the full ledger without Postgres or Google OAuth.

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). Demo password for every seeded account: `demo1234`

| Email | Role |
|---|---|
| admin@village.local | Admin |
| treasurer@village.local | Treasurer |
| committee@village.local | Committee member |
| viewer@village.local | Viewer |
| recipient@village.local | Recipient (Lakshmi Devi's distribution) |

## Production on Vercel

The production schema is **PostgreSQL**. Vercel builds run `prisma generate`, `prisma migrate deploy`, then `next build`. Demo password accounts are **off** in production unless `ENABLE_DEMO_LOGIN=true`.

### 1. Database

Create Postgres (Vercel Storage → Postgres, [Neon](https://neon.tech), or [Supabase](https://supabase.com)). Copy:

| App variable | Typical provider name |
|---|---|
| `DATABASE_URL` | Pooled / Prisma URL (`POSTGRES_PRISMA_URL`, Neon `-pooler` host) |
| `DIRECT_URL` | Direct / non-pooled URL (`POSTGRES_URL_NON_POOLED`) |

If you only have one connection string, set **both** `DATABASE_URL` and `DIRECT_URL` to it.

### 2. Google OAuth

1. Google Cloud → APIs & Services → Credentials → OAuth 2.0 Client (Web application).
2. Authorized redirect URI: `https://YOUR-DOMAIN/api/auth/callback/google` (also add the `*.vercel.app` URL if you use it).
3. Put the client ID and secret in Vercel env vars.

### 3. Import the GitHub repo

Vercel → Add New → Project → import this repository. Framework preset: Next.js. Build command stays `npm run build`.

### 4. Environment variables (Production)

Generate secrets with `openssl rand -base64 32`.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled Postgres URL |
| `DIRECT_URL` | Yes | Direct Postgres URL (migrations) |
| `NEXTAUTH_URL` | Yes | Canonical site URL, e.g. `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Yes | Random 32+ byte secret |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth secret |
| `ADMIN_EMAILS` | Yes | Your Gmail, comma-separated; first sign-in becomes Admin |
| `CRON_SECRET` | Yes | Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` |
| `ENABLE_DEMO_LOGIN` | No | Default off in production |

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
