// Creates demo accounts and cars. Safe to re-run: existing rows are left alone.
// Usage: npm run db:seed
import bcrypt from "bcryptjs";
import pg from "pg";

const users = [
  { name: "Maria Manager", email: "manager@example.com", password: "manager123", role: "manager" },
  { name: "Alice Driver", email: "alice@example.com", password: "driver123", role: "driver" },
  { name: "Bob Driver", email: "bob@example.com", password: "driver123", role: "driver" },
];

const cars = [
  { plate: "ABC-123", make: "Toyota", model: "Corolla", driver: "alice@example.com" },
  { plate: "XYZ-789", make: "Ford", model: "Transit", driver: "bob@example.com" },
  { plate: "JKL-456", make: "Honda", model: "Civic", driver: null },
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [u.name, u.email, hash, u.role],
    );
  }
  for (const c of cars) {
    await client.query(
      `INSERT INTO cars (plate, make, model, driver_id)
       VALUES ($1, $2, $3, (SELECT id FROM users WHERE email = $4))
       ON CONFLICT (plate) DO NOTHING`,
      [c.plate, c.make, c.model, c.driver],
    );
  }
  console.log("seeded demo users and cars");
} finally {
  await client.end();
}
