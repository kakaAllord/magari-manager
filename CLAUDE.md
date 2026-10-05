@AGENTS.md

# The system is live

Zuraja Magari runs this app for real: the Vercel deployment from `main` holds the company's real
staff, cars, requests, income, fuel and receipts on Neon. Every change has to respect that.

- **Every push to `main` deploys and runs new migrations on production.** A migration must work on
  the data already there: add columns as nullable or with defaults, backfill existing rows in the
  same migration, and never drop or rewrite data people still read. Test it on the local copy first
  (`npm run db:migrate`).
- **Requests are in flight at all times.** When a step is added to or changed in the request flow,
  decide in the migration where rows already part-way through go (precedent: old approvals were
  treated as paid in 006, payments before 008 never wait for a receipt, approvals before 013 count
  as authorised). Don't strand anything in a queue nobody can see.
- **Push a feature's commits together once the whole set builds**, so production never runs half a
  flow (for example a new step with no page to act on it). Commit in small slices locally first.
- **People are signed in.** Don't change session handling, role names or routes in a way that logs
  people out or sends them to a dead page; old links should still land somewhere sensible.
- **The GitHub repo is public.** Never commit a real password, a hash of one, or the Neon URL. A
  real account added by migration gets the unusable hash `'!'` and a password set afterwards
  (`npm run create-…` or in the app), as 013 does.
- **Never seed demo data, wipe tables or run one-off fixes on Neon.** Demo data needs `DEMO_MODE=1`,
  which production doesn't set. Real accounts are added by migration (`010`, `013`) or in the app.
- New UI is Swahili-only and light-only, like the rest. The one exception is the install card
  (`install-prompt.tsx`), which is in English.

# Who does what

- **Mkurugenzi** (director, `/director`): overview, reports, fuel; adds the **meneja wa kiwanda**
  and the **mhasibu**, and can give any staff member a new password. Nobody can be switched off
  from the app (removed on purpose); anyone switched off earlier can only be switched back on.
- **Meneja wa kiwanda** (role `factory_manager`, `/factory`): authorises or declines what the vehicle
  manager approved; sees the fleet's money, cars, fuel and reports; adds the vehicle managers.
- **Meneja** (role `manager`, `/manager`): approves drivers' requests, asks for money
  themselves, records income, runs cars, drivers and fuel.
- **Mhasibu** (role `accountant`, `/accountant`): pays authorised requests and adds their receipts.
- **Dereva** (driver, `/driver`): signs in with the car's plate and asks for money.

Request flow: pending → meneja approves → meneja wa kiwanda authorises → mhasibu pays →
receipt.
