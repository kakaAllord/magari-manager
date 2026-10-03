import "server-only";
import { query } from "@/lib/db";
import { missingForFuel } from "@/lib/fuel-ready";
import { stretchesFor, totalsOf, type Fill, type Reading, type Stretch, type Totals } from "@/lib/fuel-calc";

export type FuelType = "petrol" | "diesel";
export const fuelTypeName: Record<FuelType, string> = { petrol: "Petroli", diesel: "Dizeli" };

export type FuelPeriod = "30" | "90" | "365" | "all";
export const fuelPeriods: { value: FuelPeriod; label: string }[] = [
  { value: "30", label: "Siku 30" },
  { value: "90", label: "Siku 90" },
  { value: "365", label: "Mwaka mmoja" },
  { value: "all", label: "Tangu mwanzo" },
];
export const parseFuelPeriod = (v: unknown): FuelPeriod =>
  fuelPeriods.some((p) => p.value === v) ? (v as FuelPeriod) : "90";

type CarRow = {
  id: number;
  plate: string;
  car: string | null;
  fuel_type: FuelType | null;
  tank_litres: number | null;
  driver: string | null;
};
type ReadingRow = {
  id: number;
  car_id: number;
  driver_id: number | null;
  odometer_km: number;
  gauge_eighths: number;
  created_at: Date;
  recorded_by: string | null;
  by_manager: boolean;
};
type FillRow = { car_id: number; amount: string; fuel_price: number | null; issued_at: Date };

export type LastReading = { id: number; odometer: number; eighths: number; at: Date; by: string | null; byManager: boolean };

export type CarFuel = CarRow & {
  last: LastReading | null;
  // Fuel paid for since the last reading, still to be measured by the next one.
  litresSinceLast: number;
  totals: Totals;
};
export type DriverFuel = { id: number | null; name: string; totals: Totals };
export type StretchRow = Stretch & { plate: string; driver: string };

export type FuelOverview = {
  cars: CarFuel[];
  drivers: DriverFuel[];
  stretches: StretchRow[];
  all: Totals;
  prices: Record<FuelType, number | null>;
};

// A period picked on the Mafuta page, as the time range a stretch must end in.
export const periodRange = (period: FuelPeriod): FuelRange => ({
  since: period === "all" ? -Infinity : Date.now() - Number(period) * 86_400_000,
  until: Infinity,
});

// Report dates are whole Tanzanian days, "YYYY-MM-DD".
export const dayRange = (from: string, to: string): FuelRange => ({
  since: Date.parse(`${from}T00:00:00+03:00`),
  until: Date.parse(`${to}T23:59:59.999+03:00`),
});

export type FuelRange = { since: number; until: number };

// Everything the Mafuta page and the reports show. Stretches count in the range they end in;
// `carIds` (empty for all) narrows to some cars.
export async function getFuelOverview(range: FuelRange, carIds: number[] = []): Promise<FuelOverview> {
  const [cars, readings, fills, priceRows, users] = await Promise.all([
    query<CarRow>(
      `SELECT c.id, c.plate, c.name AS car, c.fuel_type, c.tank_litres, u.name AS driver
         FROM cars c LEFT JOIN users u ON u.id = c.driver_id
        ORDER BY c.plate`,
    ),
    query<ReadingRow>(
      `SELECT r.id, r.car_id, r.driver_id, r.odometer_km, r.gauge_eighths, r.created_at,
              u.name AS recorded_by, r.request_id IS NULL AS by_manager
         FROM fuel_readings r LEFT JOIN users u ON u.id = r.recorded_by
        ORDER BY r.created_at, r.id`,
    ),
    query<FillRow>(
      `SELECT car_id, amount, fuel_price, issued_at FROM money_requests
        WHERE kind = 'fuel' AND issued_at IS NOT NULL AND car_id IS NOT NULL`,
    ),
    query<{ fuel_type: FuelType; price_per_litre: number }>("SELECT fuel_type, price_per_litre FROM fuel_prices"),
    query<{ id: number; name: string }>("SELECT id, name FROM users WHERE role = 'driver'"),
  ]);

  const prices: Record<FuelType, number | null> = { petrol: null, diesel: null };
  for (const p of priceRows) prices[p.fuel_type] = p.price_per_litre;
  const names = new Map(users.map((u) => [u.id, u.name]));
  const driverName = (id: number | null) => (id === null ? "Bila dereva" : (names.get(id) ?? "Dereva aliyeondolewa"));

  const inPeriod: StretchRow[] = [];
  const chosen = carIds.length ? cars.filter((c) => carIds.includes(c.id)) : cars;
  const carFuel: CarFuel[] = chosen.map((car) => {
    const price = car.fuel_type ? prices[car.fuel_type] : null;
    const mine = readings.filter((r) => r.car_id === car.id);
    const myFills: Fill[] = fills
      .filter((f) => f.car_id === car.id)
      .map((f) => {
        const perLitre = f.fuel_price ?? price;
        return { at: f.issued_at.getTime(), amount: Number(f.amount), litres: perLitre ? Number(f.amount) / perLitre : null };
      });
    const lastRow = mine.at(-1);
    const last = lastRow
      ? {
          id: lastRow.id,
          odometer: lastRow.odometer_km,
          eighths: lastRow.gauge_eighths,
          at: lastRow.created_at,
          by: lastRow.recorded_by,
          byManager: lastRow.by_manager,
        }
      : null;
    const litresSinceLast = last
      ? myFills.filter((f) => f.at > last.at.getTime()).reduce((s, f) => s + (f.litres ?? 0), 0)
      : 0;

    let stretches: Stretch[] = [];
    if (car.tank_litres) {
      const rs: Reading[] = mine.map((r) => ({
        id: r.id,
        at: r.created_at.getTime(),
        odometer: r.odometer_km,
        eighths: r.gauge_eighths,
        driverId: r.driver_id,
      }));
      stretches = stretchesFor(rs, myFills, car.tank_litres, price).filter((s) => s.to.at >= range.since && s.to.at <= range.until);
      for (const s of stretches) inPeriod.push({ ...s, plate: car.plate, driver: driverName(s.driverId) });
    }
    return { ...car, last, litresSinceLast, totals: totalsOf(stretches) };
  });

  const byDriver = Map.groupBy(inPeriod, (s) => s.driverId);
  const drivers = [...byDriver]
    .map(([id, ss]) => ({ id, name: driverName(id), totals: totalsOf(ss) }))
    .toSorted((a, b) => b.totals.km - a.totals.km);

  return {
    cars: carFuel,
    drivers,
    stretches: inPeriod.toSorted((a, b) => b.to.at - a.to.at),
    all: totalsOf(inPeriod),
    prices,
  };
}

// The car's latest reading, which a new one is checked against.
export async function lastOdometer(carId: number) {
  const rows = await query<{ odometer_km: number }>(
    "SELECT odometer_km FROM fuel_readings WHERE car_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1",
    [carId],
  );
  return rows[0]?.odometer_km ?? null;
}

// What the driver sees above the fuel form: their car's latest reading and the tank size.
export async function getDriverFuelContext(driverId: number) {
  const rows = await query<{
    odometer_km: number | null;
    gauge_eighths: number | null;
    created_at: Date | null;
    open_fuel: boolean;
    fuel_type: string | null;
    tank_litres: number | null;
  }>(
    `SELECT r.odometer_km, r.gauge_eighths, r.created_at, c.fuel_type, c.tank_litres,
            EXISTS (SELECT 1 FROM money_requests m
                     WHERE m.car_id = c.id AND m.kind = 'fuel'
                       AND (m.status = 'pending' OR (m.status = 'approved' AND m.issued_at IS NULL))) AS open_fuel
       FROM cars c
       LEFT JOIN LATERAL (SELECT odometer_km, gauge_eighths, created_at FROM fuel_readings
                           WHERE car_id = c.id ORDER BY created_at DESC, id DESC LIMIT 1) r ON true
      WHERE c.driver_id = $1`,
    [driverId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    last: row.odometer_km === null ? null : { odometer: row.odometer_km, eighths: row.gauge_eighths!, at: row.created_at! },
    openFuel: row.open_fuel,
    missing: missingForFuel({ fuelType: row.fuel_type, tank: row.tank_litres, measured: row.odometer_km !== null }),
  };
}
