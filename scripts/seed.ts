// Creates demo accounts, cars, requests, income and fuel readings. Safe to re-run: existing rows are left alone.
// Usage: npm run db:seed
import bcrypt from "bcryptjs";
import pg from "pg";

const manager = { name: "Grace Mollel", email: "manager@example.com", password: "manager123" };
const director = { name: "Baraka Mushi", email: "director@example.com", password: "director123" };
const accountant = { name: "Rehema Kweka", email: "accountant@example.com", password: "accountant123" };

// Each driver signs in with their car's plate and the password below.
const cars = [
  { plate: "T103ABE", make: "Toyota", model: "IST", driver: { name: "Juma Hassan", password: "driver123" } },
  { plate: "T456BCD", make: "Toyota", model: "Hiace", driver: { name: "Neema Mushi", password: "driver123" } },
  { plate: "T789CDE", make: "Suzuki", model: "Carry", driver: null },
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  for (const [user, role] of [[manager, "manager"], [director, "director"], [accountant, "accountant"]] as const) {
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
  // A few months of history so the dashboard and reports have something to show. "issued" was
  // approved and paid by the mhasibu; "approved" is still waiting for the mhasibu.
  const { rows: existing } = await client.query("SELECT 1 FROM money_requests LIMIT 1");
  if (existing.length === 0) {
    const history: [plate: string, daysAgo: number, amount: number, reason: string, status: string][] = [
      ["T103ABE", 150, 45000, "Mafuta", "issued"],
      ["T456BCD", 140, 120000, "Matairi mapya", "issued"],
      ["T103ABE", 110, 38000, "Mafuta", "issued"],
      ["T456BCD", 95, 60000, "Kubadilisha oili na filta", "issued"],
      ["T103ABE", 80, 15000, "Maegesho bandarini", "rejected"],
      ["T456BCD", 70, 52000, "Mafuta", "issued"],
      ["T103ABE", 45, 250000, "Breki na ufundi", "issued"],
      ["T456BCD", 35, 47000, "Mafuta", "issued"],
      ["T103ABE", 12, 40000, "Mafuta ya safari ya uwanja wa ndege", "issued"],
      ["T456BCD", 5, 30000, "Usafi wa gari na mafuta", "issued"],
      ["T103ABE", 2, 60000, "Kubadilisha oili", "approved"],
      ["T456BCD", 1, 85000, "Kubadilisha taa ya mbele", "pending"],
      ["T103ABE", 0, 20000, "Ushuru wa barabara na maegesho", "pending"],
    ];
    for (const [plate, daysAgo, amount, reason, status] of history) {
      await client.query(
        `INSERT INTO money_requests (requester_id, car_id, amount, reason, status, reviewed_by, reviewed_at,
                                    issued_by, issued_at, created_at)
         SELECT c.driver_id, c.id, $2, $3, CASE WHEN $4 = 'issued' THEN 'approved' ELSE $4 END,
                CASE WHEN $4 = 'pending' THEN NULL ELSE (SELECT id FROM users WHERE email = $5) END,
                CASE WHEN $4 = 'pending' THEN NULL ELSE now() - make_interval(days => $6) + interval '3 hours' END,
                CASE WHEN $4 = 'issued' THEN (SELECT id FROM users WHERE email = $7) END,
                CASE WHEN $4 = 'issued' THEN now() - make_interval(days => $6) + interval '5 hours' END,
                now() - make_interval(days => $6)
           FROM cars c WHERE c.plate = $1 AND c.driver_id IS NOT NULL`,
        [plate, amount, reason, status, manager.email, daysAgo, accountant.email],
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
  // Two months of fuel readings. Juma drove the Hiace until a handover to Neema 35 days ago, then
  // the IST. Neema's Hiace has one thirsty stretch and a fuel request still waiting for the manager;
  // the Carry has never been measured, so the manager can start it.
  const { rows: existingFuel } = await client.query("SELECT 1 FROM fuel_readings LIMIT 1");
  if (existingFuel.length === 0) {
    await client.query(
      `INSERT INTO fuel_prices (fuel_type, price_per_litre) VALUES ('petrol', 2950), ('diesel', 2850)
       ON CONFLICT (fuel_type) DO NOTHING`,
    );
    for (const [plate, fuelType, tank] of [["T103ABE", "petrol", 42], ["T456BCD", "diesel", 70], ["T789CDE", "petrol", 36]]) {
      await client.query("UPDATE cars SET fuel_type = $2, tank_litres = $3 WHERE plate = $1 AND tank_litres IS NULL", [
        plate,
        fuelType,
        tank,
      ]);
    }
    // [daysAgo, odometer, gauge in eighths, driver, fuel bought (TSh) or null for a manager's reading, status]
    type Step = [number, number, number, string, number | null, "issued" | "pending"];
    const fuel: [plate: string, price: number, steps: Step[]][] = [
      ["T456BCD", 2850, [
        [60, 128_400, 4, "Juma Hassan", null, "issued"],
        [55, 128_650, 1, "Juma Hassan", 120_000, "issued"],
        [49, 128_950, 2, "Juma Hassan", 140_000, "issued"],
        [42, 129_330, 3, "Juma Hassan", 110_000, "issued"],
        [35, 129_620, 4, "Neema Mushi", null, "issued"],
        [30, 129_860, 1, "Neema Mushi", 150_000, "issued"],
        [24, 130_120, 3, "Neema Mushi", 100_000, "issued"],
        [17, 130_330, 1, "Neema Mushi", 150_000, "issued"],
        [10, 130_630, 3, "Neema Mushi", 120_000, "issued"],
        [4, 130_910, 4, "Neema Mushi", 90_000, "issued"],
        [0, 131_160, 4, "Neema Mushi", 80_000, "pending"],
      ]],
      ["T103ABE", 2950, [
        [34, 86_120, 2, "Juma Hassan", null, "issued"],
        [33, 86_250, 0, "Juma Hassan", 90_000, "issued"],
        [27, 86_640, 1, "Juma Hassan", 100_000, "issued"],
        [20, 87_080, 2, "Juma Hassan", 85_000, "issued"],
        [13, 87_470, 3, "Juma Hassan", 70_000, "issued"],
        [6, 87_860, 2, "Juma Hassan", 90_000, "issued"],
        [2, 88_150, 4, "Juma Hassan", 60_000, "issued"],
      ]],
    ];
    for (const [plate, price, steps] of fuel) {
      for (const [daysAgo, odometer, eighths, driver, amount, status] of steps) {
        const at = `now() - make_interval(days => ${daysAgo}) - interval '${daysAgo === 0 ? 3 : 0} hours'`;
        let requestId: number | null = null;
        if (amount !== null) {
          const issued = status === "issued";
          const inserted = await client.query<{ id: number }>(
            `INSERT INTO money_requests (requester_id, car_id, amount, reason, kind, fuel_price, status,
                                        reviewed_by, reviewed_at, issued_by, issued_at, created_at)
             SELECT d.id, c.id, $3, 'Mafuta', 'fuel', $4, CASE WHEN $5 THEN 'approved' ELSE 'pending' END,
                    CASE WHEN $5 THEN (SELECT id FROM users WHERE email = $6) END,
                    CASE WHEN $5 THEN ${at} + interval '1 hour' END,
                    CASE WHEN $5 THEN (SELECT id FROM users WHERE email = $7) END,
                    CASE WHEN $5 THEN ${at} + interval '2 hours' END,
                    ${at}
               FROM cars c, users d WHERE c.plate = $1 AND d.name = $2 AND d.role = 'driver'
             RETURNING id`,
            [plate, driver, amount, price, issued, manager.email, accountant.email],
          );
          requestId = inserted.rows[0]?.id ?? null;
        }
        await client.query(
          `INSERT INTO fuel_readings (car_id, driver_id, recorded_by, request_id, odometer_km, gauge_eighths, created_at)
           SELECT c.id, d.id, CASE WHEN $3::int IS NULL THEN (SELECT id FROM users WHERE email = $6) ELSE d.id END,
                  $3, $4, $5, ${at}
             FROM cars c, users d WHERE c.plate = $1 AND d.name = $2 AND d.role = 'driver'`,
          [plate, driver, requestId, odometer, eighths, manager.email],
        );
      }
    }
  }
  console.log("seeded demo users, cars, requests, income and fuel");
} finally {
  await client.end();
}
