# Technical Documentation

## 1. System overview

The project is a Next.js 14 App Router application using React 18, TypeScript, NextAuth v4, Prisma 5, and PostgreSQL in production. The UI uses server-rendered route pages and server actions; JSON endpoints are implemented as Next.js route handlers. Tailwind CSS is used for styling. PDF reports are rendered with `@react-pdf/renderer`; Excel workbooks are parsed with `xlsx`.

```text
Browser
  -> Next.js App Router pages and server actions
  -> NextAuth session and server-side permission checks
  -> Prisma Client
  -> PostgreSQL (production) / SQLite (local development)

Vercel Cron -> /api/cron/reminders -> reminder scheduler/logging -> Prisma
```

## 2. Source map

| Area | Location | Responsibility |
|---|---|---|
| App routes and layouts | `src/app/` | Dashboard, event, report, reminder, recipient, and admin screens; API routes |
| Server actions | `src/app/actions.ts` | Authenticated form mutations and cache revalidation |
| Authentication | `src/lib/auth.ts`, `src/lib/session.ts` | NextAuth providers, token/session claims, user and permission guards |
| Authorization | `src/lib/rbac.ts` | Role-permission matrix |
| Financial domain | `src/lib/ledger.ts`, `src/lib/interest.ts`, `src/lib/money.ts` | Ledger totals, mutations, interest, and rupee/paise conversion |
| Import | `src/lib/excel-import.ts` | Workbook validation and transactional import |
| Reminders | `src/lib/reminders.ts` | Scanning due reminders, marking sent, and generic log output |
| PDF | `src/lib/pdf/EventReportDocument.tsx` and `src/app/api/reports/[id]/pdf/route.ts` | PDF layout and authenticated download endpoint |
| Persistence | `prisma/schema.prisma`, `prisma/schema.sqlite.prisma`, `prisma/migrations/` | PostgreSQL/local SQLite data models and migrations |
| Deployment scripts | `scripts/`, `vercel.json` | Prisma schema selection/generation/migrations and scheduled cron |

## 3. Language support

The interface supports English (`en`) and Telugu (`te`). The language selector is available on the sign-in page and in the authenticated app shell. The selected language is stored in the `app-locale` browser cookie for one year and is used to set the document language for accessibility and Telugu font fallback.

Translations are maintained in `src/lib/i18n.ts`. Server-rendered route content is placed inside `LocalizedContent`; client components with their own interface text use the same translation helper. Translation is exact-copy based, so user-provided text that does not exactly match a UI phrase remains unchanged.

## 4. Runtime and configuration

Use Node.js 24.x. The canonical local setup and production Vercel procedure are in the repository README. Configure secrets in the deployment environment; do not commit `.env` files. Vercel preview builds skip migrations; production builds require both pooled `DATABASE_URL` and direct `DIRECT_URL` and apply pending migrations before building.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Prisma database connection; pooled PostgreSQL connection in production |
| `DIRECT_URL` | Direct PostgreSQL connection for migrations |
| `NEXTAUTH_SECRET` | Signs/encrypts NextAuth session tokens |
| `NEXTAUTH_URL` | Canonical HTTPS production URL registered for Google OAuth; local development defaults to localhost |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Enable Gmail Google OAuth when both are set |
| `ADMIN_EMAIL` | Designated initial Google Admin address |
| `ADMIN_EMAILS` | Additional designated Admin addresses, comma-separated |
| `ENABLE_DEMO_LOGIN` | Enables demo login only when set to `true` |
| `CRON_SECRET` | Bearer token required by the reminder cron endpoint |
| `ORG_NAME`, `VILLAGE_NAME`, `VILLAGE_DISTRICT`, `VILLAGE_STATE` | Optional production seed values |
| `VILLAGE_HEADLINE`, `VILLAGE_DESCRIPTION` | Optional login-page copy |

Google sign-in is enabled only when both Google credentials exist, and the callback permits Gmail addresses. Password credentials are available for provisioned accounts; production demo access should remain disabled. The deployment runbook in `README.md` includes database setup, OAuth callback URLs, seeding, and cron configuration.

## 5. Data model

Primary schema: `prisma/schema.prisma`. IDs are Prisma-generated CUID strings unless otherwise noted.

| Model | Purpose and key relationships |
|---|---|
| `Organization` | Owns villages |
| `Village` | Belongs to an organization; scopes users, people, and events |
| `User` | Login identity, role, optional village and one-to-one person link; owns sessions and audit entries |
| `Account`, `Session`, `VerificationToken` | NextAuth adapter records |
| `Person` | Village person with contact details; relates to distributions and optionally one user |
| `Event` | Village event and opening balance; owns donations, expenses, distributions, documents, and feedback |
| `Donation` | Event contribution with unique optional transaction reference |
| `Expense` | Event expense with category, description, date, and optional payee/receipt reference |
| `Distribution` | Principal, recipient/person, guarantors, source, interest terms, dates, reminders, and payments |
| `DistributionPayment` | A repayment against a distribution |
| `Reminder` | Unique per distribution and reminder kind; scheduled and sent timestamps |
| `EventFeedback` | User-authored event observation with completion state |
| `EventDocument` | Event document title and URL; current UI does not provide file upload |
| `AuditLog` | Actor, action, entity, serialized before/after values, timestamp |

Financial amounts are stored as integer paise. The user interface accepts rupees and conversion is centralized in `src/lib/money.ts`. Roles, event status, payment method, interest method, funding source, and reminder kind are string-backed constants in `src/lib/enums.ts`.

## 6. Authorization and privacy

`requireUser` obtains the NextAuth server session. `requirePermission` checks the role matrix and, except for user management, requires a village assignment. Route handlers and server actions call these guards before their protected work. Event and people data queries are scoped to the active user's village.

| Permission | Admin | Treasurer | Committee member | Viewer | Recipient |
|---|---:|---:|---:|---:|---:|
| `viewFinance` | Yes | Yes | Yes | Yes | No |
| `writeFinance` | Yes | Yes | No | No | No |
| `writeEvents` | Yes | Yes | Yes | No | No |
| `writePeople` | Yes | Yes | Yes | No | No |
| `viewReminders` | Yes | Yes | No | No | No |
| `viewAudit` | Yes | Yes | No | No | No |
| `manageUsers` | Yes | No | No | No | No |

Recipient pages query only records linked through the user's `personId`. Contact numbers are masked according to `src/lib/privacy.ts`. Reminder text is generic and does not contain names or amounts. Passwords are stored as bcrypt hashes. Security response headers are configured in `vercel.json`.

## 7. Ledger and interest calculations

`getEventLedgerTotals` derives event totals from current donation, expense, distribution, and payment rows; no editable balance is stored.

```text
availableBeforeDistribution = opening + donations - expenses
donationFundedDistributed = sum(max(0, principal - repayments)) for DONATION distributions
repaidInterest = sum(max(0, repayments - principal)) for DONATION distributions
distributableBalance = availableBeforeDistribution - donationFundedDistributed + repaidInterest
eventGenerated = sum(principal) for EVENT_GENERATED distributions
totalAvailable = availableBeforeDistribution + eventGenerated + repaidInterest
```

`totalDistributed` includes net outstanding principal from both funding sources. Event-generated principal is tracked separately and does not consume donation-funded distributable balance. A distribution is rejected if donation-funded principal exceeds that balance. Closing is blocked when donation-funded net distributed principal exceeds available-before-distribution funds.

Interest is rounded to the nearest paise and does not compound. Annual simple and Custom use `principal × rate × days / 365`. Monthly simple is implemented as `principal × annual rate × days / 360`. Fixed amount returns the configured fixed interest. Outstanding is `max(0, principal + interest-to-date - repayments)`. The UI/API permit repayment entries larger than current outstanding; the ledger treats amounts over principal as repaid interest for donation-funded balance calculations.

## 8. Application routes

| Page | Purpose |
|---|---|
| `/` | Sign-in page |
| `/dashboard` | Village overview or recipient landing |
| `/events` | Event list, year filter, workbook import |
| `/events/new` | Create event |
| `/events/[id]` | Event ledger, feedback, donations, expenses, distributions, repayments, PDF link |
| `/reports` | Filter report events and download PDFs |
| `/reminders` | Reminder schedule for permitted roles |
| `/my-loan` | Recipient's own distributions and repayments |
| `/settings/users` | Admin user provisioning and role management |
| `/audit` | Audit history for permitted roles |
| `/change-password` | Required password change for provisioned accounts |
| `/people` | Currently redirects to `/dashboard` |

## 9. JSON API

All endpoints except health and the cron endpoint require a valid authenticated session and role permission. Errors are returned as JSON by the shared HTTP error handler. Money inputs use rupees in form/API fields such as `amount`; persisted fields ending in `Paise` are integer paise.

| Method and path | Permission | Behavior |
|---|---|---|
| `GET /api/health` | Public | Health response |
| `GET /api/events?year=YYYY` | `viewFinance` | Events with computed ledger totals; omit year or use `all` for all years |
| `POST /api/events` | `writeEvents` | Create active event |
| `GET /api/events/[id]` | `viewFinance` | Read event details |
| `POST /api/events/[id]/donations` | `writeFinance` | Add donation |
| `POST /api/events/[id]/expenses` | `writeFinance` | Add expense |
| `POST /api/events/[id]/distributions` | `writeFinance` | Add distribution and reminders |
| `GET /api/people` | `viewFinance` | List village people |
| `POST /api/people` | `writePeople` | Create village person |
| `POST /api/events/import` | `writeEvents` | Multipart `.xlsx` import, max 10 MB |
| `GET /api/events/import/template` | `writeEvents` | Download sample workbook |
| `GET /api/reports/[id]/pdf` | `viewFinance` | Generate/download event PDF |
| `GET /api/cron/reminders` | Bearer `CRON_SECRET` | Mark due reminders sent and return counts |

This list reflects the implemented route handlers; it is not a guarantee of a stable public API. The UI also uses server actions for edits/deletes and other mutations.

## 10. Excel import contract

The import API accepts a multipart form field named `file`. It requires three sheets:

- `Event Details`: key/value rows. Required values: event name and start date. Optional: year, end date, description, opening balance.
- `Donations`: a header row containing `Name` and `Amount`. Supported optional columns include date, method, transaction reference, notes, and received-by.
- `Expenses`: a header row containing `Date`, `Expense Item`, and `Amount (₹)`. Supported optional columns include category, payee, and receipt reference.

Header aliases and numbered/prefixed sheet names are supported by `src/lib/excel-import.ts`. Amounts accept up to two decimals. Dates support Excel dates, parseable date strings, and day-first `DD-MM-YYYY`. The import runs in a database transaction. Event identity is `(villageId, name, year)`; a match is updated, otherwise an Active event is created. Donation/expense rows are appended, not replaced. Duplicate donation transaction references and summary rows are skipped.

## 11. Reminder processing

Creating a distribution creates five unique reminder rows: 30 days before, 15 days before, 7 days before, due day, and one day after the due date. The Vercel schedule in `vercel.json` invokes `GET /api/cron/reminders` daily at 03:00 UTC. The endpoint requires `Authorization: Bearer <CRON_SECRET>`. Due unsent rows are logged and marked sent. This is bookkeeping only; no delivery provider is configured. If a due date changes, old reminder rows are deleted and the schedule is recreated.

## 12. Build, test, and deployment

Common commands:

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
npm test
npm run lint
npm run build
```

The production build validates required environment variables, generates Prisma Client, deploys migrations, and runs `next build`. Vercel preview deployments skip production migrations. Production uses PostgreSQL with `DATABASE_URL` and `DIRECT_URL`; local development uses SQLite through the repository's Prisma scripts/schema. CI validates lint, types, tests, and a local SQLite build on Node 24. Production setup, Google OAuth, environment variables, first seed, cron verification, migration recovery, and health check are documented in `README.md`.

## 13. Operational and maintenance notes

- Back up the production database using the database provider's supported backup/PITR process before migrations or bulk imports. Confirm restore procedures periodically.
- Review the audit log and original receipts during financial reconciliation; a generated PDF is a report, not proof of payment.
- Do not retry a partially understood import. Inspect the event first because ordinary donation/expense rows append on each run.
- Test migrations against a non-production database before production deployment.
- Run `npm test`, `npm run lint`, and `npm run build` for code changes. The test script currently runs finance, HTTP error, and auth tests.
- Changes to roles, balance formulas, import aliases, reminder delivery, or schema need corresponding tests and updates to this document and the user manual.