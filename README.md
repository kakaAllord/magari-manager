# Magari

A Next.js + Postgres app for running ZURAJA TRADING COMPANY LTD's fleet, in Swahili. Drivers sign in
with their car's plate number and request money: fuel (with the car's odometer and fuel
gauge) or anything else with a reason. Managers sign in
with email, approve or reject requests, ask for money themselves (approved as they ask, for a
car or none), record income (the car it came from, amount, optional
description; the recorder can delete an entry within 24 hours), manage cars and
drivers, watch income and spending on a dashboard, and see reports with separate
spend and income on tabs plus every entry with its date, downloadable as a PDF or an Excel
workbook (formulas, tables and native charts) per car, month or week. On Mafuta they record each
car's first reading, set fuel prices and tank sizes, and see km per litre by car, by driver and
per stretch between readings, with suspicious stretches flagged.
A mhasibu (accountant) signs in with email and pays out approved requests, with an optional
note such as an M-Pesa reference. A director signs in with email, adds managers and mhasibu,
switches them off and on, reads the same reports and Mafuta, and sees an overview of income,
spending, the balance, each car and fuel. Long lists (requests,
payouts, income) live on their own Historia pages, 25 per page.
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

Below the login form, a box with five compartments (Mkurugenzi, Meneja, Mhasibu, Dereva 1,
Dereva 2) fills in these details with one tap. It shows unless `DEMO_MODE=0`; set that once
the site is used for real.

| Role     | Sign in with         | Password    |
| -------- | -------------------- | ----------- |
| Director | director@example.com | director123 |
| Driver  | plate `T103ABE`     | driver123  |
| Driver  | plate `T456BCD`     | driver123  |
| Manager | manager@example.com | manager123 |
| Mhasibu | accountant@example.com | accountant123 |
| Manager | manager2@example.com | manager123 |
| Mhasibu (switched off) | accountant2@example.com | accountant123 |

The seed also loads two months of fuel readings: the Hiace handed from Juma to Neema, one
flagged stretch, a fuel request waiting for the manager, and an unmeasured Carry. Each part of
the seed runs only when its table is empty, so re-running it is safe.

These passwords are public. Only seed a database that is meant to be a demo.

## Deploy to Vercel

1. Import the GitHub repo in Vercel. No build settings need changing: Vercel runs
   `npm run vercel-build`, which applies database migrations before building.
2. Add a Postgres database (Storage → Neon). This sets `DATABASE_URL`.
   Otherwise set `DATABASE_URL` yourself (use the pooled URL with `?sslmode=require`).
3. Choose one:
   - **Demo site:** add `DEMO_MODE=1` and redeploy. The build loads the demo
     accounts and history.
   - **Real use:** set `DEMO_MODE=0` (hides the demo box), create the director
     from your machine, then add managers, the mhasibu, cars and drivers in the app:

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
directors and the mhasibu join `private-managers` and each driver only `private-driver-<their id>`.

## Scripts

| Command              | What it does                                   |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Apply new migrations, then start the dev server |
| `npm run db:migrate` | Apply new files in `db/migrations/` in order   |
| `npm run db:seed`    | Insert demo users, cars and history (safe to re-run) |
| `npm run create-director -- "Name" email password` | Create a director or reset their password |
| `npm run create-manager -- "Name" email password` | Create a manager or reset their password |
| `npm test`           | Unit tests (Node test runner)                  |
| `npm run build`      | Production build                               |

## How it fits together

- `db/migrations/`: plain SQL schema for `users` (driver, manager, director or accountant), `cars`,
  `sessions`, `money_requests`, `incomes`, `fuel_readings` and `fuel_prices`.
- `src/lib/session.ts`: cookie sessions stored hashed in Postgres; `requireUser(role)`
  guards every page, layout and server action.
- `src/app/actions/`: server actions for login, requests, cars, drivers, income,
  managers and the signed-in person's own password.
- `src/app/driver`, `src/app/manager`, `src/app/accountant`, `src/app/director`: the role-specific areas, each wrapped in
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
- `src/lib/realtime.ts`, `src/components/live-updates.tsx`: Pusher signals and the
  client that refreshes on them.

A request goes pending → approved or rejected (by a manager; a manager's own request is
approved on creation) → paid by the mhasibu (`issued_at`, `issued_by`, `issue_note`).
`money_requests.requester_id` is whoever asked. Expenses are paid requests, dated by
payment time in Tanzania (Africa/Dar_es_Salaam); requests approved before the mhasibu
existed were marked paid at their approval time. Income is dated by when it was recorded and picked against a
car (`incomes.car_id`; `source` keeps the plate, and entries from before cars were
picked keep their typed source). The report's car filter narrows both spend and
income; income from before cars were picked shows only with all cars. Deleted income and
switched-off staff stay in the database (`deleted_at`, `deactivated_at`) so
history keeps their names. Review is only possible while a request is pending, and payment
only while it is approved and unpaid, so two people clicking at once can't overwrite each
other.
