# Village Events & Programs

Web ledger for village festival funds, donations, expenses, and repayable distributions. Built for **Vercel** (Next.js 14, NextAuth, Prisma). Money is stored as **integer paise**. Event balances are **always derived from transactions**, never typed in as an editable total.

This is a working Phase 1 app: Google or demo login, roles, events, donations, expenses, distributions with interest and due dates, reminder scheduling, PDF reports, people directory, and an audit log.

## Run locally

```bash
npm install
npx prisma db push
npx prisma db seed
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

Copy `.env.example` to `.env`. Local demo uses SQLite (`file:./dev.db`) so you can try the full ledger without Postgres or Google OAuth.

## Production on Vercel

1. Create a Postgres database (Vercel Postgres, Neon, or Supabase).
2. In `prisma/schema.prisma`, set `provider = "postgresql"` and add `DIRECT_URL` if your host uses a pooled connection.
3. Set environment variables from `.env.example`: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`, `CRON_SECRET`.
4. Add the Google OAuth callback `https://YOUR-DOMAIN/api/auth/callback/google`.
5. Deploy, then run `npx prisma db push` and `npx prisma db seed` against production (or migrate).
6. Sign in with an email listed in `ADMIN_EMAILS`. Attach that user to a village in Prisma Studio if needed.

`vercel.json` registers a daily cron at 03:00 UTC that hits `/api/cron/reminders`. Due reminders are marked sent once; the message stays generic because phones may be shared. Wire email, web push, or WhatsApp onto that same scan when you are ready.

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
