// Creates demo accounts, cars, requests, income and fuel readings. Safe to re-run: existing rows are left alone.
// Usage: npm run db:seed
import bcrypt from "bcryptjs";
import pg from "pg";

const manager = { name: "Grace Mollel", email: "manager@example.com", password: "manager123" };
const director = { name: "Baraka Mushi", email: "director@example.com", password: "director123" };
const accountant = { name: "Rehema Kweka", email: "accountant@example.com", password: "accountant123" };
const factory = { name: "Daudi Mrema", email: "factory@example.com", password: "factory123" };

// Each driver signs in with their car's plate and the password below. T321DEF is only a plate, as
// a manager may add a car before knowing more about it.
const cars = [
  { plate: "T103ABE", name: "Toyota IST", driver: { name: "Juma Hassan", password: "driver123" } },
  { plate: "T456BCD", name: "Toyota Hiace", driver: { name: "Neema Mushi", password: "driver123" } },
  { plate: "T789CDE", name: "Suzuki Carry", driver: null },
  { plate: "T321DEF", name: null, driver: null },
];

// The live site holds real data. Demo accounts have public passwords, so the demo only goes where
// DEMO_MODE=1 says this database is a demo or local copy.
if (process.env.DEMO_MODE !== "1") {
  console.error("Refusing to seed demo data: set DEMO_MODE=1 if this database is a demo or local copy.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  // The director adds the factory manager and the mhasibu; the factory manager adds the vehicle managers.
  for (const [user, role, addedBy] of [
    [director, "director", null],
    [factory, "factory_manager", director.email],
    [manager, "manager", factory.email],
    [accountant, "accountant", director.email],
  ] as const) {
    await client.query(
      `INSERT INTO users (name, email, password_hash, role, added_by)
       VALUES ($1, $2, $3, $4, (SELECT id FROM users WHERE email = $5))
       ON CONFLICT (email) DO NOTHING`,
      [user.name, user.email, await bcrypt.hash(user.password, 10), role, addedBy],
    );
  }
  // More staff for the Wafanyakazi page: a second manager, and a mhasibu who has been switched off.
  for (const [name, email, role, off, addedBy] of [
    ["Peter Massawe", "manager2@example.com", "manager", false, factory.email],
    ["Saida Ally", "accountant2@example.com", "accountant", true, director.email],
  ] as const) {
    await client.query(
      `INSERT INTO users (name, email, password_hash, role, deactivated_at, added_by)
       VALUES ($1, $2, $3, $4, CASE WHEN $5 THEN now() - interval '20 days' END, (SELECT id FROM users WHERE email = $6))
       ON CONFLICT (email) DO NOTHING`,
      [name, email, await bcrypt.hash(role === "manager" ? "manager123" : "accountant123", 10), role, off, addedBy],
    );
  }
  for (const c of cars) {
    const inserted = await client.query<{ id: number }>(
      `INSERT INTO cars (plate, name) VALUES ($1, $2)
       ON CONFLICT (plate) DO NOTHING RETURNING id`,
      [c.plate, c.name],
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
  // approved, authorised and paid; "approved" waits for the factory manager, "authorised" for the
  // mhasibu; "declined" was approved by the manager and turned down by the factory manager.
  const { rows: existing } = await client.query("SELECT 1 FROM money_requests LIMIT 1");
  if (existing.length === 0) {
    const history: [plate: string, daysAgo: number, amount: number, reason: string, status: string][] = [
      ["T103ABE", 150, 45000, "Mafuta", "issued"],
      ["T456BCD", 140, 120000, "Matairi mapya", "issued"],
      ["T103ABE", 110, 38000, "Mafuta", "issued"],
      ["T456BCD", 95, 60000, "Kubadilisha oili na filta", "issued"],
      ["T103ABE", 80, 15000, "Maegesho bandarini", "rejected"],
      ["T456BCD", 20, 180000, "Rangi mpya ya gari", "declined"],
      ["T456BCD", 70, 52000, "Mafuta", "issued"],
      ["T103ABE", 45, 250000, "Breki na ufundi", "issued"],
      ["T456BCD", 35, 47000, "Mafuta", "issued"],
      ["T103ABE", 12, 40000, "Mafuta ya safari ya uwanja wa ndege", "issued"],
      ["T456BCD", 5, 30000, "Usafi wa gari na mafuta", "issued"],
      ["T456BCD", 3, 70000, "Betri mpya", "authorised"],
      ["T103ABE", 2, 60000, "Kubadilisha oili", "approved"],
      ["T456BCD", 1, 85000, "Kubadilisha taa ya mbele", "pending"],
      ["T103ABE", 0, 20000, "Ushuru wa barabara na maegesho", "pending"],
    ];
    for (const [plate, daysAgo, amount, reason, status] of history) {
      await client.query(
        `INSERT INTO money_requests (requester_id, car_id, amount, reason, status, reviewed_by, reviewed_at,
                                    factory_reviewed_by, factory_reviewed_at, issued_by, issued_at, created_at)
         SELECT c.driver_id, c.id, $2, $3,
                CASE WHEN $4 IN ('issued', 'authorised') THEN 'approved' WHEN $4 = 'declined' THEN 'rejected' ELSE $4 END,
                CASE WHEN $4 = 'pending' THEN NULL ELSE (SELECT id FROM users WHERE email = $5) END,
                CASE WHEN $4 = 'pending' THEN NULL ELSE now() - make_interval(days => $6) + interval '3 hours' END,
                CASE WHEN $4 IN ('issued', 'authorised', 'declined') THEN (SELECT id FROM users WHERE email = $8) END,
                CASE WHEN $4 IN ('issued', 'authorised', 'declined') THEN now() - make_interval(days => $6) + interval '4 hours' END,
                CASE WHEN $4 = 'issued' THEN (SELECT id FROM users WHERE email = $7) END,
                CASE WHEN $4 = 'issued' THEN now() - make_interval(days => $6) + interval '5 hours' END,
                now() - make_interval(days => $6)
           FROM cars c WHERE c.plate = $1 AND c.driver_id IS NOT NULL`,
        [plate, amount, reason, status, manager.email, daysAgo, accountant.email, factory.email],
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
                                        reviewed_by, reviewed_at, factory_reviewed_by, factory_reviewed_at,
                                        issued_by, issued_at, created_at)
             SELECT d.id, c.id, $3, 'Mafuta', 'fuel', $4, CASE WHEN $5 THEN 'approved' ELSE 'pending' END,
                    CASE WHEN $5 THEN (SELECT id FROM users WHERE email = $6) END,
                    CASE WHEN $5 THEN ${at} + interval '1 hour' END,
                    CASE WHEN $5 THEN (SELECT id FROM users WHERE email = $8) END,
                    CASE WHEN $5 THEN ${at} + interval '90 minutes' END,
                    CASE WHEN $5 THEN (SELECT id FROM users WHERE email = $7) END,
                    CASE WHEN $5 THEN ${at} + interval '2 hours' END,
                    ${at}
               FROM cars c, users d WHERE c.plate = $1 AND d.name = $2 AND d.role = 'driver'
             RETURNING id`,
            [plate, driver, amount, price, issued, manager.email, accountant.email, factory.email],
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
  // Receipts: payments of the last three weeks needed one. The three newest still wait for the
  // mhasibu; the older ones carry a sample receipt (an SVG, which real uploads can't be).
  const { rows: existingReceipts } = await client.query(
    "SELECT 1 FROM money_requests WHERE receipt_due UNION ALL SELECT 1 FROM receipts LIMIT 1",
  );
  if (existingReceipts.length === 0) {
    const { rows: paid } = await client.query<{ id: number; amount: string; reason: string; kind: string; plate: string | null; issued_at: Date }>(
      `UPDATE money_requests r SET receipt_due = true WHERE r.issued_at > now() - interval '21 days'
       RETURNING r.id, r.amount, r.reason, r.kind, (SELECT plate FROM cars WHERE id = r.car_id) AS plate, r.issued_at`,
    );
    paid.sort((a, b) => b.issued_at.getTime() - a.issued_at.getTime());
    for (const [i, p] of paid.slice(3).entries()) {
      const no = String(4100 + i * 37).padStart(6, "0");
      await client.query(
        `INSERT INTO receipts (request_id, content_type, data, note, uploaded_by, created_at)
         VALUES ($1, 'image/svg+xml', $2, $3, (SELECT id FROM users WHERE email = $4), $5::timestamptz + interval '1 day')`,
        [p.id, Buffer.from(demoReceipt(p, no)), no, accountant.email, p.issued_at],
      );
    }
  }
  // History typed in yesterday by Grace: income and expenses from before the app, on their own days.
  const { rows: existingHistory } = await client.query(
    "SELECT 1 FROM incomes WHERE backfilled_at IS NOT NULL UNION ALL SELECT 1 FROM money_requests WHERE backfilled_at IS NOT NULL LIMIT 1",
  );
  if (existingHistory.length === 0) {
    const day = (daysAgo: number) => `(date_trunc('day', now() AT TIME ZONE 'Africa/Dar_es_Salaam')
      - make_interval(days => ${daysAgo}) + time '12:00') AT TIME ZONE 'Africa/Dar_es_Salaam'`;
    const past: [kind: "income" | "expense", daysAgo: number, plate: string | null, amount: number, text: string][] = [
      ["income", 200, "T103ABE", 480000, "Safari ya Mwanza, wageni wa kampuni"],
      ["income", 185, "T456BCD", 350000, "Kukodisha Hiace kwa harusi"],
      ["expense", 195, "T456BCD", 320000, "Matairi mapya manne"],
      ["expense", 180, null, 90000, "Kodi ya ofisi"],
    ];
    for (const [kind, daysAgo, plate, amount, text] of past) {
      if (kind === "income") {
        await client.query(
          `INSERT INTO incomes (car_id, source, amount, description, recorded_by, created_at, backfilled_at)
           SELECT c.id, c.plate, $2, $3, (SELECT id FROM users WHERE email = $4), ${day(daysAgo)}, now() - interval '1 day'
             FROM cars c WHERE c.plate = $1`,
          [plate, amount, text, manager.email],
        );
      } else {
        await client.query(
          `INSERT INTO money_requests (requester_id, car_id, amount, reason, status, reviewed_by, reviewed_at,
                                      created_at, factory_reviewed_at, issued_at, backfilled_at)
           SELECT m.id, (SELECT id FROM cars WHERE plate = $1), $2, $3, 'approved', m.id, ${day(daysAgo)},
                  ${day(daysAgo)}, ${day(daysAgo)}, ${day(daysAgo)}, now() - interval '1 day'
             FROM users m WHERE m.email = $4`,
          [plate, amount, text, manager.email],
        );
      }
    }
  }
  // Cargo income, priced per tonne: amount is the rate times the tonnes. Guarded on its own so a copy
  // seeded before cargo existed gets it too.
  const { rows: existingCargo } = await client.query("SELECT 1 FROM incomes WHERE tonnes IS NOT NULL LIMIT 1");
  if (existingCargo.length === 0) {
    const cargo: [daysAgo: number, plate: string, rate: number, tonnes: number, destination: string | null, text: string | null][] = [
      [40, "T456BCD", 45000, 3, "Dar es Salaam - Morogoro", "Saruji, mteja Kilimanjaro Traders"],
      [21, "T789CDE", 38000, 1.5, "Kibaha", null],
      [9, "T456BCD", 52000, 2.75, "Dar es Salaam - Dodoma", "Mbolea"],
      [2, "T103ABE", 45000, 1, "Dar es Salaam - Morogoro", null],
    ];
    for (const [daysAgo, plate, rate, tonnes, destination, text] of cargo) {
      await client.query(
        `INSERT INTO incomes (car_id, source, amount, rate_per_tonne, tonnes, destination, description, recorded_by, created_at)
         SELECT c.id, c.plate, round($2::numeric * $3), $2, $3, $4, $5, (SELECT id FROM users WHERE email = $6),
                now() - make_interval(days => $7)
           FROM cars c WHERE c.plate = $1`,
        [plate, rate, tonnes, destination, text, manager.email, daysAgo],
      );
    }
  }
  // Income on credit: one part paid with a payment since, one not paid at all, one paid off.
  const { rows: existingDebt } = await client.query("SELECT 1 FROM incomes WHERE customer_name IS NOT NULL LIMIT 1");
  if (existingDebt.length === 0) {
    const debts: [daysAgo: number, plate: string, rate: number, tonnes: number, destination: string, customer: string, paid: [daysAgo: number, amount: number, note: string | null][]][] = [
      [18, "T456BCD", 48000, 2, "Dar es Salaam - Tanga", "Mwambao Hardware", [[18, 40000, null], [6, 20000, "M-Pesa QJK81T2"]]],
      [5, "T789CDE", 40000, 1.25, "Bagamoyo", "Juma Shaban", []],
      [12, "T103ABE", 45000, 1, "Dar es Salaam - Morogoro", "Kilimanjaro Traders", [[12, 15000, null], [3, 30000, "Benki CRDB"]]],
    ];
    for (const [daysAgo, plate, rate, tonnes, destination, customer, paid] of debts) {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO incomes (car_id, source, amount, rate_per_tonne, tonnes, destination, recorded_by, created_at, amount_paid, customer_name)
         SELECT c.id, c.plate, round($2::numeric * $3), $2, $3, $4, (SELECT id FROM users WHERE email = $5),
                now() - make_interval(days => $6), $7, $8
           FROM cars c WHERE c.plate = $1
         RETURNING id`,
        [plate, rate, tonnes, destination, manager.email, daysAgo, paid.reduce((s, [, a]) => s + a, 0), customer],
      );
      for (const [ago, amount, note] of paid) {
        await client.query(
          `INSERT INTO income_payments (income_id, amount, note, paid_at, recorded_by)
           VALUES ($1, $2, $3, now() - make_interval(days => $4), (SELECT id FROM users WHERE email = $5))`,
          [rows[0]?.id, amount, note, ago, manager.email],
        );
      }
    }
  }
  // A possible repeat waiting for the manager: Neema asked again for nearly what she asked yesterday
  // and sent it anyway after the warning, so it carries the "Huenda ni marudio" flag.
  const { rows: existingRepeat } = await client.query("SELECT 1 FROM money_requests WHERE duplicate_of IS NOT NULL LIMIT 1");
  if (existingRepeat.length === 0) {
    await client.query(
      `WITH neema AS (SELECT c.id AS car_id, c.driver_id FROM cars c WHERE c.plate = 'T456BCD' AND c.driver_id IS NOT NULL),
            first AS (INSERT INTO money_requests (requester_id, car_id, amount, reason, status, reviewed_by, reviewed_at,
                                                 factory_reviewed_at, factory_reviewed_by, created_at)
                      SELECT driver_id, car_id, 85000, 'Kubadilisha breki za mbele', 'approved',
                             (SELECT id FROM users WHERE email = $1), now() - interval '20 hours',
                             now() - interval '18 hours', (SELECT id FROM users WHERE email = $2), now() - interval '1 day'
                        FROM neema RETURNING id, requester_id, car_id)
       INSERT INTO money_requests (requester_id, car_id, amount, reason, duplicate_of, created_at)
       SELECT requester_id, car_id, 85000, 'Breki za mbele', id, now() - interval '2 hours' FROM first`,
      [manager.email, factory.email],
    );
  }
  // Maoni from both drivers. The director has read the oldest; the managers haven't read any yet.
  const { rows: existingFeedback } = await client.query("SELECT 1 FROM feedback LIMIT 1");
  if (existingFeedback.length === 0) {
    const notes: [plate: string, daysAgo: number, body: string, readByDirector: boolean][] = [
      ["T456BCD", 12, "Tunaomba matairi ya akiba yakaguliwe kila mwezi. Mara mbili tumekwama njiani.", true],
      ["T103ABE", 5, "Malipo ya mafuta yanachelewa jioni. Ingesaidia mhasibu awepo hadi saa 12.", false],
      ["T456BCD", 1, "Asanteni kwa mafunzo ya usalama barabarani wiki iliyopita.", false],
    ];
    for (const [plate, daysAgo, body, readByDirector] of notes) {
      const inserted = await client.query<{ id: number }>(
        `INSERT INTO feedback (author_id, body, created_at)
         SELECT driver_id, $2, now() - make_interval(days => $3) FROM cars WHERE plate = $1 AND driver_id IS NOT NULL
         RETURNING id`,
        [plate, body, daysAgo],
      );
      if (readByDirector && inserted.rows[0]) {
        await client.query(
          "INSERT INTO feedback_reads (feedback_id, reader_id) SELECT $1, id FROM users WHERE email = $2",
          [inserted.rows[0].id, director.email],
        );
      }
    }
  }
  // Two invoices: one paid last month, one still open with two trips.
  const { rows: existingInvoices } = await client.query("SELECT 1 FROM invoices LIMIT 1");
  if (existingInvoices.length === 0) {
    const invoices: [daysAgo: number, customer: string, contact: string | null, paid: boolean, lines: [string, string | null, number, number][]][] = [
      [30, "Kilimanjaro Traders Ltd", "0754 123 456\nTIN 123-456-789", true, [["Dar es Salaam - Morogoro", "T456BCD", 3, 45000]]],
      [3, "Mbeya Cement Distributors", "0713 987 654", false, [
        ["Dar es Salaam - Dodoma", "T456BCD", 2.75, 52000],
        ["Dar es Salaam - Kibaha", "T789CDE", 1.5, 38000],
      ]],
    ];
    for (const [daysAgo, customer, contact, paid, lines] of invoices) {
      const total = lines.reduce((sum, [, , tonnes, rate]) => sum + Math.round(tonnes * rate), 0);
      const inserted = await client.query<{ id: number }>(
        `WITH day AS (SELECT (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date - $1::int AS d),
              next AS (SELECT extract(year FROM d)::int AS year,
                              coalesce((SELECT max(seq) FROM invoices i WHERE i.year = extract(year FROM d)), 0) + 1 AS seq FROM day)
         INSERT INTO invoices (year, seq, number, customer_name, customer_contact, issued_on, due_on, payment_details, total,
                               created_by, created_at, paid_at, paid_by)
         SELECT next.year, next.seq, 'ANK-' || next.year || '-' || lpad(next.seq::text, 3, '0'), $2, $3, day.d, day.d + 14,
                'Benki CRDB, akaunti 0150-0000000, jina Zuraja Magari', $4, m.id, now() - make_interval(days => $1),
                CASE WHEN $5 THEN now() - make_interval(days => $1 - 7) END, CASE WHEN $5 THEN m.id END
           FROM day, next, users m WHERE m.email = $6
         RETURNING id`,
        [daysAgo, customer, contact, total, paid, manager.email],
      );
      for (const [i, [description, plate, tonnes, rate]] of lines.entries()) {
        await client.query(
          `INSERT INTO invoice_lines (invoice_id, position, description, plate, tonnes, rate_per_tonne, amount)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [inserted.rows[0].id, i + 1, description, plate, tonnes, rate, Math.round(tonnes * rate)],
        );
        // Each trip is in Mapato as the client's debt from the invoice's day, paid off when it was paid.
        const income = await client.query<{ id: number }>(
          `INSERT INTO incomes (car_id, source, amount, description, recorded_by, created_at, rate_per_tonne, tonnes,
                                destination, amount_paid, customer_name, invoice_id)
           SELECT c.id, $1, $2::numeric, 'Ankara ' || v.number, v.created_by, v.created_at, $3, $4, $5,
                  CASE WHEN $6 THEN $2::numeric ELSE 0 END, v.customer_name, v.id
             FROM invoices v LEFT JOIN cars c ON c.plate = $1 WHERE v.id = $7
           RETURNING id`,
          [plate ?? "Bila gari", Math.round(tonnes * rate), rate, tonnes, description, paid, inserted.rows[0].id],
        );
        if (paid) {
          await client.query(
            `INSERT INTO income_payments (income_id, amount, note, paid_at, recorded_by)
             SELECT $1, $2, 'Ankara ' || number, paid_at, paid_by FROM invoices WHERE id = $3`,
            [income.rows[0].id, Math.round(tonnes * rate), inserted.rows[0].id],
          );
        }
      }
    }
  }
  // Payment vouchers: every demo payment made in the app gets its number in the order it was paid,
  // as migration 020 numbered real ones. Typed-in history gets none.
  await client.query(
    `INSERT INTO payment_vouchers (request_id, year, seq, number)
     SELECT id, year, seq, 'HM-' || year || '-' || lpad(seq::text, greatest(3, length(seq::text)), '0')
       FROM (SELECT r.id, y.year,
                    coalesce((SELECT max(seq) FROM payment_vouchers pv WHERE pv.year = y.year), 0)
                      + row_number() OVER (PARTITION BY y.year ORDER BY r.issued_at, r.id)::int AS seq
               FROM money_requests r
               CROSS JOIN LATERAL (SELECT extract(year FROM r.issued_at AT TIME ZONE 'Africa/Dar_es_Salaam')::int AS year) y
              WHERE r.issued_at IS NOT NULL AND r.backfilled_at IS NULL
                AND NOT EXISTS (SELECT 1 FROM payment_vouchers pv WHERE pv.request_id = r.id)) numbered`,
  );
  console.log("seeded demo users, cars, requests, income, cargo, possible repeats, debts, maoni, invoices, fuel, receipts, vouchers and typed-in history");
} finally {
  await client.end();
}

// A till receipt drawn as an SVG, so the demo has something to open.
function demoReceipt(p: { amount: string; reason: string; kind: string; plate: string | null; issued_at: Date }, no: string) {
  const fuel = p.kind === "fuel";
  const amount = Number(p.amount).toLocaleString("en-US");
  const date = p.issued_at.toISOString().slice(0, 10);
  const esc = (s: string) => s.replace(/[<>&"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  const lines = [
    [fuel ? "PUMA ENERGY" : "MSHIKAMANO AUTO SPARES", 22, "bold"],
    [fuel ? "Ubungo, Dar es Salaam" : "Kariakoo, Dar es Salaam", 15, ""],
    ["TIN 100-234-567  VRN 40-012345-K", 13, ""],
    ["", 10, ""],
    [`RISITI NA. ${no}`, 15, "bold"],
    [`Tarehe ${date}`, 14, ""],
    [p.plate ? `Gari ${p.plate}` : "", 14, ""],
    ["--------------------------------", 14, ""],
    [esc(p.reason.slice(0, 30)), 15, ""],
    ["--------------------------------", 14, ""],
    [`JUMLA  TSh ${amount}`, 20, "bold"],
    ["", 10, ""],
    ["Asante, karibu tena", 14, ""],
  ] as const;
  let y = 50;
  const text = lines
    .map(([t, size, weight]) => {
      y += Number(size) + 14;
      return `<text x="200" y="${y}" font-size="${size}" font-weight="${weight || "normal"}" text-anchor="middle">${t}</text>`;
    })
    .join("");
  // A torn edge along the bottom, drawn right to left back to the start.
  const teeth = Array.from({ length: 20 }, (_, i) => `L${390 - i * 20},${y + 60} L${380 - i * 20},${y + 50}`).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="${y + 70}" viewBox="0 0 400 ${y + 70}" font-family="monospace" fill="#222">
<rect width="400" height="${y + 70}" fill="#e8e6e1"/><path d="M0,0 H400 V${y + 50} ${teeth} Z" fill="#fffdf8"/>${text}</svg>`;
}
