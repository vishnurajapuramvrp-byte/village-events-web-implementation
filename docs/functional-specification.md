# Functional Specification

## 1. Purpose and scope

Village Events & Programs is a web ledger for recording village programme funds, donations, expenses, distributions, repayments, and event follow-up. It provides role-based access, a computed event balance, a PDF report, an audit trail, and due-date tracking.

The current application is a Phase 1 implementation. It records financial transactions and calculates balances; it is not an accounting package, payment processor, or notification delivery service. Reminder jobs currently record due reminders as sent and write generic messages to the server log. They do not send SMS, email, or WhatsApp messages.

## 2. Users and permissions

Permissions are enforced on the server. Navigation links are also hidden when a role lacks the corresponding permission.

| Role | View finance | Write finance | Create/edit events | Manage people and users | View reminders | View audit |
|---|---:|---:|---:|---:|---:|---:|
| Admin | Yes | Yes | Yes | Users: yes; people records are created with distributions | Yes | Yes |
| Treasurer | Yes | Yes | Yes | People records are created with distributions | Yes | Yes |
| Committee member | Yes | No | Yes | People records are created with distributions | No | No |
| Viewer | Yes | No | No | No | No | No |
| Recipient | Own distribution only | No | No | No | No | No |

The People route currently redirects to the dashboard; it is not a standalone directory management screen. Person records can be created while recording a distribution or through the authenticated people API. An Admin can link a login to a person on the Users screen.

## 3. Functional areas

### 3.1 Authentication and account management

- Users can sign in with Google when OAuth is configured, or with an email/mobile identifier and password when a password account has been created.
- Google sign-in accepts Gmail addresses. A configured designated admin address receives the Admin role; other new Google accounts receive Viewer by default.
- Admins can create password accounts, assign roles, optionally link a village person, change roles, and delete accounts.
- Newly created password accounts must change their temporary password before continuing.
- The system prevents removing or deleting the last Admin and prevents an Admin from deleting their own account.
- A user must be assigned to a village to access village-scoped data.

### 3.2 Dashboard

Committee users see event count, cash across events, open distributions, event balances, due items, and recent audit activity when their role permits it. Recipients see a link to their own distribution page and may see an in-app due reminder. A user without a village assignment sees an assignment notice instead of village data.

### 3.3 Events

- Authorized users can create events with name, programme year, dates, description, and opening balance.
- Events are created with Active status. The schema also defines Draft, but normal event creation does not use it.
- Event lists can be filtered by year. An event detail page shows its computed totals and the donation, expense, distribution, and feedback records.
- Authorized users can edit or delete an open event. Closed events cannot be edited or deleted.
- An authorized user can close an event. Closure is blocked when donation-funded principal still distributed exceeds available funds.
- Event deletion cascades to its attached ledger and feedback records. Only delete an event when this is intended.

### 3.4 Donations

Finance writers can add, edit, or delete a donation on an open event. A record includes donor, amount, received date, payment method, optional transaction reference, and notes. Methods are Cash, UPI, Bank, and Other. Transaction references are unique. A zero-amount donation is accepted only when it has a transaction reference.

### 3.5 Expenses

Finance writers can add, edit, or delete event expenses. A record includes category, description, positive amount, date incurred, optional payee, and optional receipt reference. Expenses are attached to an event and reduce its available balance.

### 3.6 Distributions and repayments

- Finance writers can record a distribution to a village person. If the person does not already exist, a person record is created from the recipient name and optional phone number.
- Each new distribution requires principal, start date, two guarantor names and phone numbers, a funding source, an interest method, and a due date. The default due date is one year after the start date.
- Funding source is Donation amount or Event Generated Amount. Donation-funded principal cannot exceed the current distributable balance. Event-generated principal is tracked separately and is not constrained by that donation-funded balance check.
- Interest methods are annual simple, monthly simple, fixed amount, and custom. Custom currently uses the same calculation as annual simple.
- Finance writers can edit distribution details and record repayments with amount, payment date, and optional note. Outstanding is calculated as principal plus calculated interest to date minus repayments, floored at zero.
- The current UI does not enforce repayment amount against outstanding balance. Review entries and correct errors carefully.
- Due-date reminders are scheduled at 30 days, 15 days, and 7 days before due date, on the due date, and one day after due date. Changing a distribution due date replaces its reminder schedule.

### 3.7 Event feedback

Any signed-in user with access to an event can submit feedback. Feedback is displayed on that event and can be marked completed or reopened. The PDF report includes feedback and completion state.

### 3.8 Reports

Users with finance-view permission can filter the report list by year and event and download an event PDF. The PDF includes event details, income, expenses, distributions, computed balances, feedback, a generated-by footer/disclaimer, and a signature section. Phone details are masked or shown according to the application's privacy rules. Reports should be checked against original receipts.

### 3.9 Reminders

Users with reminder-view permission can view the schedule, filter by event, and see queued/sent status. A daily Vercel Cron request runs at 03:00 UTC. It marks due records as sent once and logs generic text without financial details. No external delivery channel is implemented.

### 3.10 Excel import

Event writers can import `.xlsx` workbooks up to 10 MB. The workbook requires `Event Details`, `Donations`, and `Expenses` sheets; numbered or prefixed sheet names are also matched. Event details are matched by event name and year and updated if present. Donation and expense rows are appended. Duplicate donation transaction references and summary rows are skipped; invalid row data fails the import transaction.

Download the sample workbook from the Events screen before preparing an import. Importing the same workbook again can append rows that do not have transaction references; review the event ledger before retrying an import.

## 4. Financial rules

All amounts are entered/displayed in rupees and stored as integer paise.

```text
Available before distribution = opening balance + donations - expenses
Donation-funded distributed = max(0, donation-funded principal - repayments)
Distributable balance = available before distribution - donation-funded distributed + repaid interest
```

Repayments beyond the recorded principal are treated as repaid interest for donation-funded distributions. Event-generated amounts are reported separately from the donation-funded distributable balance. The exact total fields are documented in the technical documentation.

Annual simple interest is `principal × annual rate × elapsed days / 365`. Monthly simple interest is `principal × annual rate × elapsed days / 360`. Fixed amount uses the configured fixed interest. Custom currently follows annual simple interest. Values are rounded to the nearest paise. Interest does not compound.

## 5. Core workflow

1. An Admin seeds/maintains the village and provisions user accounts or designates the initial Google Admin.
2. An event writer creates an event or imports an event workbook.
3. Finance writers record donations and expenses as they occur.
4. Finance writers record distributions and repayments; the system computes balances and creates reminders.
5. Users add and resolve event feedback.
6. Finance-view users inspect the event ledger and download a PDF report.
7. An event writer closes the event after verifying transactions and outstanding distribution balances.

## 6. Non-functional requirements and limitations

- The app is a responsive web application intended for supported modern browsers.
- Server-side permissions and village-scoped queries protect operational data. User, financial, and event changes are written to an audit log where instrumented.
- Google OAuth secrets, database URLs, NextAuth secret, and cron secret are server configuration and must not be exposed to clients.
- Production is designed for PostgreSQL and Vercel. Local development is configured for SQLite.
- This release does not implement direct payment collection, external reminder delivery, document/file upload, or a standalone people directory UI.
- Financial terms and lending practices require local legal and accounting review before real-money use.