// Creates a logistics manager (or, with --director, a director; --factory, a factory manager;
// --dev, the hidden developer account), or sets a new password if the email already exists.
// Usage: npm run create-manager -- "Grace Mollel" grace@example.com 'a-strong-password'
//        npm run create-director -- "Baraka Mushi" baraka@example.com 'a-strong-password'
//        npm run create-factory-manager -- "Daudi Mrema" daudi@example.com 'a-strong-password'
//        npm run create-dev   (reads DEV_NAME, DEV_EMAIL and DEV_PASSWORD from the gitignored .env;
//                              arguments, when given, win)
import bcrypt from "bcryptjs";
import pg from "pg";

const flags = ["--director", "--factory", "--dev"];
const args = process.argv.slice(2);
const role = args.includes("--director")
  ? "director"
  : args.includes("--factory")
    ? "factory_manager"
    : args.includes("--dev")
      ? "dev"
      : "manager";
const positional = args.filter((a) => !flags.includes(a));
// The dev account's credentials live in .env (never committed), so it needs no arguments.
const fromEnv = role === "dev" ? [process.env.DEV_NAME || "Dev", process.env.DEV_EMAIL, process.env.DEV_PASSWORD] : [];
const [name, rawEmail, password] = [0, 1, 2].map((i) => positional[i] || fromEnv[i]);
if (!name || !rawEmail || !password || password.length < 8) {
  console.error(`Usage: npm run create-${role.replace("_", "-")} -- "Full Name" email password (8+ characters)`);
  process.exit(1);
}
const email = rawEmail.trim().toLowerCase();

// Say which database is being changed (host only, never the URL with its password).
let host = "?";
try {
  host = new URL(process.env.DATABASE_URL ?? "").hostname;
} catch {}
console.log(`database: ${host}`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query<{ created: boolean }>(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role,
           deactivated_at = NULL
     RETURNING (xmax = 0) AS created`,
    [name, email, await bcrypt.hash(password, 10), role],
  );
  console.log(rows[0].created ? `created ${role} ${email}` : `updated ${role} ${email}`);
} finally {
  await client.end();
}
