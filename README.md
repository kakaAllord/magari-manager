# Car Manager

A small Next.js + Postgres app. Drivers sign in and request money with a reason;
managers sign in, approve or reject requests, and manage cars. Drivers see the
decision on their page (it refreshes every 15 seconds).

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

| Role    | Email               | Password   |
| ------- | ------------------- | ---------- |
| Manager | manager@example.com | manager123 |
| Driver  | alice@example.com   | driver123  |
| Driver  | bob@example.com     | driver123  |

## Scripts

| Command              | What it does                                   |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Apply new migrations, then start the dev server |
| `npm run db:migrate` | Apply new files in `db/migrations/` in order   |
| `npm run db:seed`    | Insert demo users and cars (safe to re-run)    |
| `npm test`           | Unit tests (Node test runner)                  |
| `npm run build`      | Production build                               |

Amounts are whole Tanzanian shillings (shown as `TSh 40,000`); drivers can type `40000` or `40,000`.

## How it fits together

- `db/migrations/` — plain SQL schema: `users`, `cars`, `sessions`, `money_requests`.
- `src/lib/session.ts` — cookie sessions stored hashed in Postgres; `requireUser(role)`
  guards every page and server action.
- `src/app/actions/` — server actions for login, requests and cars.
- `src/app/driver`, `src/app/manager` — the two role-specific areas.

Review is only possible while a request is `pending`, so two managers clicking at
once can't overwrite each other's decision.
