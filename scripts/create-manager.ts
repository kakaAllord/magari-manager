// Creates a vehicle manager (or, with --director, a director; with --factory, a factory manager)
// account, or sets a new password if the email already exists.
// Usage: npm run create-manager -- "Grace Mollel" grace@example.com 'a-strong-password'
//        npm run create-director -- "Baraka Mushi" baraka@example.com 'a-strong-password'
//        npm run create-factory-manager -- "Daudi Mrema" daudi@example.com 'a-strong-password'
import bcrypt from "bcryptjs";
import pg from "pg";

const args = process.argv.slice(2);
const role = args.includes("--director") ? "director" : args.includes("--factory") ? "factory_manager" : "manager";
const [name, rawEmail, password] = args.filter((a) => a !== "--director" && a !== "--factory");
if (!name || !rawEmail || !password || password.length < 8) {
  console.error(`Usage: npm run create-${role.replace("_", "-")} -- "Full Name" email password (8+ characters)`);
  process.exit(1);
}
const email = rawEmail.trim().toLowerCase();

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
