// Vercel runs `npm run vercel-build` instead of `build`. Before building, it brings the database
// up to date with any new migrations. It never loads demo data: the database it points at is in
// real use, so `npm run db:seed` is only ever run by hand on a local copy.
import { execSync } from "node:child_process";

const run = (cmd: string) => execSync(cmd, { stdio: "inherit" });

if (process.env.DATABASE_URL) {
  run("npm run db:migrate");
} else {
  console.warn("DATABASE_URL is not set: skipping migrations. Add a Postgres database in Vercel.");
}
run("next build");
