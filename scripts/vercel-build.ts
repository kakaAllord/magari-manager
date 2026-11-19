// Vercel runs `npm run vercel-build` instead of `build`. Before building, it brings
// the database up to date, and loads the demo data when DEMO_MODE=1.
import { execSync } from "node:child_process";

const run = (cmd: string) => execSync(cmd, { stdio: "inherit" });

if (process.env.DATABASE_URL) {
  run("npm run db:migrate");
  if (process.env.DEMO_MODE === "1") run("npm run db:seed");
  // TEMPORARY, one deploy only: create the hidden dev account on production from the
  // DEV_NAME / DEV_EMAIL / DEV_PASSWORD set in Vercel's environment. Remove on the next push,
  // or every deploy will reset the dev password.
  if (!process.env.DEV_EMAIL || !process.env.DEV_PASSWORD) {
    throw new Error("DEV_EMAIL and DEV_PASSWORD must be set in Vercel to create the dev account.");
  }
  run("npm run create-dev");
} else {
  console.warn("DATABASE_URL is not set: skipping migrations. Add a Postgres database in Vercel.");
}
run("next build");
