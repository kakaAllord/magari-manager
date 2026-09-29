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
  // A few months of history so the dashboard and reports have something to show.
  const { rows: existing } = await client.query("SELECT 1 FROM money_requests LIMIT 1");
  if (existing.length === 0) {
    const history: [plate: string, daysAgo: number, amount: number, reason: string, status: string][] = [
      ["T103ABE", 150, 45000, "Fuel", "approved"],
      ["T456BCD", 140, 120000, "New tyres", "approved"],
      ["T103ABE", 110, 38000, "Fuel", "approved"],
      ["T456BCD", 95, 60000, "Oil change and filters", "approved"],
      ["T103ABE", 80, 15000, "Parking fees at the port", "rejected"],
      ["T456BCD", 70, 52000, "Fuel", "approved"],
      ["T103ABE", 45, 250000, "Brake pads and labour", "approved"],
      ["T456BCD", 35, 47000, "Fuel", "approved"],
      ["T103ABE", 12, 40000, "Fuel for the airport run", "approved"],
      ["T456BCD", 5, 30000, "Car wash and fuel", "approved"],
      ["T456BCD", 1, 85000, "Replace headlight", "pending"],
      ["T103ABE", 0, 20000, "Toll and parking", "pending"],
    ];
    for (const [plate, daysAgo, amount, reason, status] of history) {
      await client.query(
        `INSERT INTO money_requests (driver_id, car_id, amount, reason, status, reviewed_by, reviewed_at, created_at)
         SELECT c.driver_id, c.id, $2, $3, $4,
                CASE WHEN $4 = 'pending' THEN NULL ELSE (SELECT id FROM users WHERE email = $5) END,
                CASE WHEN $4 = 'pending' THEN NULL ELSE now() - make_interval(days => $6) + interval '3 hours' END,
                now() - make_interval(days => $6)
           FROM cars c WHERE c.plate = $1 AND c.driver_id IS NOT NULL`,
        [plate, amount, reason, status, manager.email, daysAgo],
      );
    }
  }
  console.log("seeded demo users, cars and requests");
} finally {
  await client.end();
}
