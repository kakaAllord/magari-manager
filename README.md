# Magari

A Next.js + Postgres app for running Zuraja Magari's fleet, in Swahili. Drivers sign in
with their car's plate number and request money: fuel (with the car's odometer and fuel
gauge, the price per litre at the station, typed each time since it differs between
stations, and the litres needed; the amount is worked out from the two) or anything else with a reason. Vehicle managers (meneja) sign in
with email, approve or reject requests, ask for money themselves (approved as they ask, for a
car or none), record income (the car it came from, and for cargo the rate per tonne, the tonnes and an
optional destination, the amount worked out from the two; other income is a plain amount;
optional description; the recorder can delete an entry within 24 hours), manage cars and
drivers, watch income and spending on a dashboard, and see reports with separate
each car's faida or hasara (income against spending, as bars), spend and income on tabs plus
every entry with its date, downloadable as a PDF or an Excel
workbook (formulas, tables and native charts) per car, month or week. On Mafuta they record each
car's first reading, set tank sizes, and see km, litres, km per litre and TSh
per km by car and by driver (measured between readings; the stretches themselves aren't shown).
A factory manager (meneja wa kiwanda) then authorises or declines every approved request, the
vehicle manager's own included, and sees the month's money, where each request is, each car's faida or hasara
with its driver, fuel and the reports (no Historia page); the factory manager also adds the vehicle managers.
A mhasibu (accountant) signs in with email and pays out authorised requests, with an optional
note such as an M-Pesa reference. Each payment then waits on Kulipa's Risiti tab until the
mhasibu adds a photo of its receipt; everyone who can see the request can open it. A director signs in with email, adds factory managers and the mhasibu,
gives any staff member a new password (nobody can be switched off from the app; anyone
switched off earlier can be switched back on), reads the same reports and Mafuta, and sees an overview of income,
spending, the balance, each car's faida or hasara and fuel. Long lists (requests,
payouts, income) live on their own Historia pages, 25 per page.
The meneja makes invoices (ankara) on the Ankara tab: a customer, trips priced as tani × bei kwa
tani, and payment details, downloaded as a PDF. Numbers run per year (ANK-2026-001) and are never
reused; a mistaken invoice is cancelled ("Imefutwa"), not edited. Invoices are documents only
(`invoices`, `invoice_lines`, migration 019): marking one paid does not touch Mapato, where the
income is still recorded.
Every payment the mhasibu makes gets a payment voucher (hati ya malipo), numbered per year of
payment (HM-2026-001) when Lipa is pressed and never reused (`payment_vouchers`, migration 020,
which numbered earlier payments in the order they were paid; typed-in history gets none). "Hati ya
malipo" beside the payment opens it as a one-page PDF to print, sign and file: the payee and car,
the reason, the amount in figures and Swahili words (`src/lib/amount-words.ts`), who asked,
approved, authorised and paid it, and signature lines, the last for whoever received the money.
Staff open every voucher; a driver only their own. The company's name and the lines printed
under it on invoices and vouchers live in `src/lib/company.ts` (`COMPANY_DETAILS`); for now that
is "Usafirishaji wa mizigo", and the address, phone and TIN go there once the company gives them.
Drivers have a Maoni tab, a suggestion box. The meneja, meneja wa kiwanda and mkurugenzi read the
notes on their own Maoni tab, anonymously: they see the text and the day, never the driver or the
car (`feedback.author_id` is kept only so drivers see their own notes). Each reader marks a note
read for themselves (`feedback_reads`, migration 018), and the driver sees once anyone has.
Before a request or income entry is saved, it is compared with what's already there: the same
car, an amount within 5% (litres for fuel) and close in time (2 days for fuel, 7 for other
requests, 3 for income) brings up "Inaonekana imeshawekwa" with the earlier entry. Pressing again
saves it with `duplicate_of` set (migration 017), and everyone who approves, authorises or pays it
sees "Huenda ni marudio". The rules live in `src/lib/duplicate-rules.ts`; no outside service is used.
Everyone can change their own password on the Akaunti page. Decisions reach
the driver instantly (Pusher), or within 10 seconds without Pusher. Amounts are
whole Tanzanian shillings.

## Setup

Requires Node 22.18+ (scripts use Node's built-in TypeScript support) and Postgres.

1. Create a database role and database (once):

   ```sh
   sudo -u postgres psql -c "CREATE ROLE carmanager LOGIN PASSWORD 'carmanager'" \
                         -c "CREATE DATABASE carmanager OWNER carmanager"
   ```

2. Configure and install:

   ```sh
   cp .env.example .env.local   # edit DATABASE_URL if needed
   npm install
   npm run db:setup             # creates the tables and demo accounts (once)
   npm run dev                  # also applies any new migrations on start
   ```

3. Open http://localhost:3000.

## Demo accounts

The live site is used for real, so demo data and the demo login box only exist where
`DEMO_MODE=1` is set (add it to `.env.local` for local work). Then `npm run db:seed` loads the
accounts below, and a box with six compartments (Mkurugenzi, Meneja wa kiwanda, Meneja,
Mhasibu, Dereva 1, Dereva 2) below the login form fills them in with one tap. Without `DEMO_MODE=1` the seed refuses
to run.

| Role     | Sign in with         | Password    |
| -------- | -------------------- | ----------- |
| Director | director@example.com | director123 |
| Factory manager | factory@example.com | factory123 |
| Driver  | plate `T103ABE`     | driver123  |
| Driver  | plate `T456BCD`     | driver123  |
| Manager | manager@example.com | manager123 |
| Mhasibu | accountant@example.com | accountant123 |
| Manager | manager2@example.com | manager123 |
| Mhasibu (switched off) | accountant2@example.com | accountant123 |

The seed also loads two months of fuel readings: the Hiace handed from Juma to Neema, a
fuel request waiting for the manager, and an unmeasured Carry. Each part of
the seed runs only when its table is empty, so re-running it is safe.

These passwords are public. Never set `DEMO_MODE=1` for the live database.

## Real use

Migration 010 adds the company's director, `director@zuraja.com`, and migration 013 its factory
manager, each only if the email is free; 015 moved the factory manager to `factorymanager@zuraja.com`. The repo is public, so 013
gives the factory manager no password: nobody can sign in to that account until one is set, either
from a machine with the Neon URL:

```sh
DATABASE_URL='postgres://…' npm run create-factory-manager -- "Meneja wa Kiwanda" factorymanager@zuraja.com 'the-password'
```

or by the director on Wafanyakazi (⋯ → Badilisha nenosiri). Each person then changes their own
password on Akaunti. The director adds factory managers and the mhasibu on Wafanyakazi;
the factory manager adds vehicle managers on Mameneja (emails `@zuraja.com`); vehicle managers add
cars and drivers. Migration 014 records who added each staff member (`users.added_by`) and moved
the vehicle managers the director had added under the factory manager.

Requests go: pending → the vehicle manager approves → the factory manager authorises → the mhasibu
pays → the receipt. Requests approved before migration 013 count as authorised, so they stayed with
the mhasibu. The database refuses a payment that wasn't authorised.

## Deploy to Vercel

1. Import the GitHub repo in Vercel. No build settings need changing: Vercel runs
   `npm run vercel-build`, which applies database migrations before building.
2. Add a Postgres database (Storage → Neon). This sets `DATABASE_URL`.
   Otherwise set `DATABASE_URL` yourself (use the pooled URL with `?sslmode=require`).
3. Choose one:
   - **Demo site:** add `DEMO_MODE=1` and redeploy. The build loads the demo
     accounts and history and shows the demo box.
   - **Real use (this deployment):** leave `DEMO_MODE` unset. The director from migration 010
     signs in; to create another director or reset one from your machine:

     ```sh
     DATABASE_URL='postgres://…' npm run create-director -- "Your Name" you@example.com 'a-strong-password'
     ```

### Instant updates (Pusher)

Without these variables pages refresh every 10 seconds. With them, new requests,
approvals and rejections show up immediately.

1. Create a free **Channels** app at https://dashboard.pusher.com.
2. In Vercel, add `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`,
   plus `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER` with the same key
   and cluster.
3. Redeploy. The `NEXT_PUBLIC_` values are built into the page, so they only take
   effect after a new build.

Events carry no data, only "requests changed"; pages then re-fetch through the
normal signed-in path. Channels are private: `/api/realtime/auth` lets managers,
directors, factory managers and the mhasibu join `private-managers` and each driver only `private-driver-<their id>`.

## Scripts

| Command              | What it does                                   |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Apply new migrations, then start the dev server |
| `npm run db:migrate` | Apply new files in `db/migrations/` in order   |
| `npm run db:seed`    | Insert demo users, cars and history (safe to re-run) |
| `npm run create-director -- "Name" email password` | Create a director or reset their password |
| `npm run create-manager -- "Name" email password` | Create a vehicle manager or reset their password |
| `npm run create-factory-manager -- "Name" email password` | Create a factory manager or reset their password |
| `npm test`           | Unit tests (Node test runner)                  |
| `npm run build`      | Production build                               |

## How it fits together

- `db/migrations/`: plain SQL schema for `users` (driver, manager, factory_manager, director or accountant), `cars`,
  `sessions`, `money_requests`, `incomes`, `fuel_readings`, `fuel_prices` (no longer edited: only a fallback for old fuel requests saved
  without a price) and `receipts`.
- `src/lib/session.ts`: cookie sessions stored hashed in Postgres; `requireUser(role)`
  guards every page, layout and server action.
- `src/app/actions/`: server actions for login, requests, cars, drivers, income,
  managers and the signed-in person's own password.
- `src/app/driver`, `src/app/manager`, `src/app/factory`, `src/app/accountant`, `src/app/director`: the role-specific areas, each wrapped in
  `AppShell` (sidebar on desktop, top bar with tabs on phones). `src/app/account` is
  shared by all roles.
- `src/lib/stats.ts`, `src/lib/reports.ts`: dashboard figures and report queries.
  `src/lib/report-data.ts` gathers one report for both downloads: `src/lib/workbook.ts` (Excel,
  with charts added by `src/lib/xlsx-charts.ts`, since ExcelJS can't write them) and
  `src/lib/report-pdf.tsx` (PDF via @react-pdf/renderer). `src/components/report-view.tsx` and
  `src/lib/report-export.ts` serve them to managers, the mhasibu and directors
  (`?format=pdf` for the PDF). `src/lib/incomes.ts`: income totals.
- `src/lib/fuel-calc.ts` (pure, unit tested) works out stretches between readings: km, litres
  used (`tank × gauge/8` at the first reading + litres paid for in between − at the second;
  litres = amount ÷ the request's price per litre), km per litre and flags. `src/lib/fuel.ts`
  loads readings and paid fuel requests for the Mafuta pages and reports.
  A car needs only its plate; Aina (e.g. "Toyota IST", one free-text field) is always optional.
  Fuel can't be requested for a car until it has a fuel type, a tank size and a first reading
  (`src/lib/fuel-ready.ts`; past-dated history excepted). The manager gives them when adding the
  car or later from its ⋯ menu on Magari; later readings go on Mafuta. A reading taken while the
  car has no driver passes to its first driver. The plate can't be edited (drivers sign in with
  it); a car added by mistake is deleted from its ⋯ menu instead, but only while no request or
  income was ever booked to it, and the database refuses otherwise (migration 012).
- Receipts are photos stored in Postgres (`receipts.data`). The browser shrinks them to at most
  1600 px before upload (`src/app/accountant/add-receipt.tsx`) to stay under the 1 MB server
  action limit; `checkReceiptImage` in `src/lib/validation.ts` accepts JPEG, PNG or WebP by
  their first bytes. `src/app/receipts/[id]/route.ts` serves them to staff and to the driver
  who asked, sandboxed.
- `src/lib/realtime.ts`, `src/components/live-updates.tsx`: Pusher signals and the
  client that refreshes on them.

A request goes pending → approved or rejected (by a manager; a manager's own request is
approved on creation) → paid by the mhasibu (`issued_at`, `issued_by`, `issue_note`) → receipt added (`receipts`).
Paying sets `receipt_due`; payments from before receipts existed have it false and never wait.
Managers can type in history: Mapato and Omba pesa have a date that defaults to today. A past
date stores the entry on that day at 12:00 Tanzanian time (`incomes.created_at`, or an expense's
`created_at`, `reviewed_at` and `issued_at`) and sets `backfilled_at` to when it was typed in, so
totals and reports place it in its month. A past expense is saved already paid, with no mhasibu
step or receipt. Lists label these entries "Rekodi ya zamani".
`money_requests.requester_id` is whoever asked. Expenses are paid requests, dated by
payment time in Tanzania (Africa/Dar_es_Salaam); requests approved before the mhasibu
existed were marked paid at their approval time. Income is dated by when it was recorded and picked against a
car (`incomes.car_id`; `source` keeps the plate, and entries from before cars were
picked keep their typed source). Cargo income also stores `rate_per_tonne`, `tonnes` and
`destination` (migration 016); `amount` holds their product, so every total reads it as before,
and older income has only its amount. The report's car filter narrows both spend and
income; income from before cars were picked shows only with all cars. Deleted income and
staff switched off before that was removed stay in the database (`deleted_at`, `deactivated_at`) so
history keeps their names. Review is only possible while a request is pending, and payment
only while it is approved and unpaid, so two people clicking at once can't overwrite each
other.
