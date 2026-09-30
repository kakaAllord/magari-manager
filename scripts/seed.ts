// Creates demo accounts, cars, requests and income. Safe to re-run: existing rows are left alone.
// Usage: npm run db:seed
import bcrypt from "bcryptjs";
import pg from "pg";

const manager = { name: "Grace Mollel", email: "manager@example.com", password: "manager123" };
const director = { name: "Baraka Mushi", email: "director@example.com", password: "director123" };

// Each driver signs in with their car's plate and the password below.
const cars = [
  { plate: "T103ABE", make: "Toyota", model: "IST", driver: { name: "Juma Hassan", password: "driver123" } },
  { plate: "T456BCD", make: "Toyota", model: "Hiace", driver: { name: "Neema Mushi", password: "driver123" } },
  { plate: "T789CDE", make: "Suzuki", model: "Carry", driver: null },
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  for (const [user, role] of [[manager, "manager"], [director, "director"]] as const) {
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [user.name, user.email, await bcrypt.hash(user.password, 10), role],
    );
  }
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
      ["T103ABE", 150, 45000, "Mafuta", "approved"],
      ["T456BCD", 140, 120000, "Matairi mapya", "approved"],
      ["T103ABE", 110, 38000, "Mafuta", "approved"],
      ["T456BCD", 95, 60000, "Kubadilisha oili na filta", "approved"],
      ["T103ABE", 80, 15000, "Maegesho bandarini", "rejected"],
      ["T456BCD", 70, 52000, "Mafuta", "approved"],
      ["T103ABE", 45, 250000, "Breki na ufundi", "approved"],
      ["T456BCD", 35, 47000, "Mafuta", "approved"],
      ["T103ABE", 12, 40000, "Mafuta ya safari ya uwanja wa ndege", "approved"],
      ["T456BCD", 5, 30000, "Usafi wa gari na mafuta", "approved"],
      ["T456BCD", 1, 85000, "Kubadilisha taa ya mbele", "pending"],
      ["T103ABE", 0, 20000, "Ushuru wa barabara na maegesho", "pending"],
    ];
    for (const [plate, daysAgo, amount, reason, status] of history) {
      await client.query(
        `INSERT INTO money_requests (requester_id, car_id, amount, reason, status, reviewed_by, reviewed_at, created_at)
         SELECT c.driver_id, c.id, $2, $3, $4,
                CASE WHEN $4 = 'pending' THEN NULL ELSE (SELECT id FROM users WHERE email = $5) END,
                CASE WHEN $4 = 'pending' THEN NULL ELSE now() - make_interval(days => $6) + interval '3 hours' END,
                now() - make_interval(days => $6)
           FROM cars c WHERE c.plate = $1 AND c.driver_id IS NOT NULL`,
        [plate, amount, reason, status, manager.email, daysAgo],
      );
    }
  }
  const { rows: existingIncome } = await client.query("SELECT 1 FROM incomes LIMIT 1");
  if (existingIncome.length === 0) {
    const income: [daysAgo: number, amount: number, plate: string, description: string | null][] = [
      [148, 600000, "T103ABE", "Safari ya Arusha, mteja wa utalii siku 3"],
      [120, 250000, "T456BCD", "Kukodisha Hiace"],
      [100, 420000, "T103ABE", "Kusafirisha mzigo Morogoro"],
      [75, 180000, "T456BCD", "Safari za uwanja wa ndege, wageni 4 wa hoteli"],
      [50, 520000, "T456BCD", "Harusi, siku 2"],
      [30, 300000, "T103ABE", null],
      [14, 220000, "T456BCD", "Safari za uwanja wa ndege"],
      [3, 450000, "T103ABE", "Mkataba wa shule, usafiri wa wanafunzi mwezi mmoja"],
    ];
    for (const [daysAgo, amount, plate, description] of income) {
      await client.query(
        `INSERT INTO incomes (car_id, source, amount, description, recorded_by, created_at)
         SELECT c.id, c.plate, $2, $3, (SELECT id FROM users WHERE email = $4), now() - make_interval(days => $5)
           FROM cars c WHERE c.plate = $1`,
        [plate, amount, description, manager.email, daysAgo],
      );
    }
  }
  console.log("seeded demo users, cars, requests and income");
} finally {
  await client.end();
}
