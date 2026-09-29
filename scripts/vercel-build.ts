// Vercel runs `npm run vercel-build` instead of `build`. Before building, it brings
// the database up to date, and loads the demo data when DEMO_MODE=1.
import { execSync } from "node:child_process";

const run = (cmd: string) => execSync(cmd, { stdio: "inherit" });

if (process.env.DATABASE_URL) {
  run("npm run db:migrate");
  if (process.env.DEMO_MODE === "1") run("npm run db:seed");
} else {
  console.warn("DATABASE_URL is not set: skipping migrations. Add a Postgres database in Vercel.");
}
run("next build");
