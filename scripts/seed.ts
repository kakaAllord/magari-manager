// Creates demo accounts and cars. Safe to re-run: existing rows are left alone.
// Usage: npm run db:seed
import bcrypt from "bcryptjs";
import pg from "pg";

const manager = { name: "Grace Mollel", email: "manager@example.com", password: "manager123" };

// Each driver signs in with their car's plate and the password below.
const cars = [
  { plate: "T103ABE", make: "Toyota", model: "IST", driver: { name: "Juma Hassan", password: "driver123" } },
  { plate: "T456BCD", make: "Toyota", model: "Hiace", driver: { name: "Neema Mushi", password: "driver123" } },
  { plate: "T789CDE", make: "Suzuki", model: "Carry", driver: null },
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'manager')
     ON CONFLICT (email) DO NOTHING`,
    [manager.name, manager.email, await bcrypt.hash(manager.password, 10)],
  );
  for (const c of cars) {
    const inserted = await client.query<{ id: number }>(
      `INSERT INTO cars (plate, make, model) VALUES ($1, $2, $3)
       ON CONFLICT (plate) DO NOTHING RETURNING id`,
      [c.plate, c.make, c.model],
    );
    // Only create the driver alongside a new car, so re-running doesn't duplicate drivers.
    const carId = inserted.rows[0]?.id;
    if (!carId || !c.driver) continue;
    const user = await client.query<{ id: number }>(
      `INSERT INTO users (name, password_hash, role) VALUES ($1, $2, 'driver') RETURNING id`,
      [c.driver.name, await bcrypt.hash(c.driver.password, 10)],
    );
    await client.query("UPDATE cars SET driver_id = $1 WHERE id = $2", [user.rows[0].id, carId]);
  }
  console.log("seeded demo users and cars");
} finally {
  await client.end();
}
