"use server";

import { revalidatePath } from "next/cache";
import { claimDriverlessReading, transaction } from "@/lib/db";
import { missingForFuel } from "@/lib/fuel-ready";
import { MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { checkPlate, normalizePlate, parseStartingReading, parseTankLitres, type ReadingErrors } from "@/lib/validation";

type CarValues = { plate: string; name: string; fuelType: string; tank: string; odometer: string; gauge: string };
type CarErrors = ReadingErrors & { plate?: string; car?: string; tank?: string };

export type CarFormState =
  | { ok: true; message: string; ready: boolean }
  | { ok: false; errors: CarErrors; values: CarValues }
  | undefined;

const UNIQUE_VIOLATION = "23505";

const readValues = (formData: FormData): CarValues => ({
  plate: String(formData.get("plate") ?? ""),
  name: String(formData.get("name") ?? "").trim().slice(0, 60),
  fuelType: String(formData.get("fuelType") ?? ""),
  tank: String(formData.get("tank") ?? "").trim(),
  odometer: String(formData.get("odometer") ?? ""),
  gauge: String(formData.get("gauge") ?? ""),
});

// Everything but the plate can wait: Aina for good, the fuel type, tank and starting reading until
// someone asks for fuel for the car.
function parseDetails(values: CarValues, errors: CarErrors) {
  const fuelType = values.fuelType === "petrol" || values.fuelType === "diesel" ? values.fuelType : null;
  const tank = values.tank ? parseTankLitres(values.tank) : { litres: null };
  if ("error" in tank) errors.tank = tank.error;
  const start = parseStartingReading(values);
  if (!start.ok) Object.assign(errors, start.errors);
  return {
    name: values.name || null,
    fuelType,
    tank: "litres" in tank ? tank.litres : null,
    reading: start.ok ? start.reading : null,
  };
}

// "Toyota IST (T103ABE)", or just the plate, and what's still missing before fuel.
function saved(plate: string, details: ReturnType<typeof parseDetails>, measured: boolean, what: string) {
  const label = details.name ? `${details.name} (${plate})` : plate;
  const missing = missingForFuel({ fuelType: details.fuelType, tank: details.tank, measured });
  return {
    ok: true as const,
    ready: !missing,
    message: missing ? `${label} ${what}. Kabla ya kuomba mafuta, weka ${missing}.` : `${label} ${what}. Liko tayari kwa mafuta.`,
  };
}

const refreshCars = async () => {
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  revalidatePath("/driver", "layout");
  await notify([MANAGERS_CHANNEL]);
};

// A new car needs only its plate. A starting reading taken now has no driver yet; the first driver
// the car is given to takes it over.
export async function createCar(_prev: CarFormState, formData: FormData): Promise<CarFormState> {
  const manager = await requireUser("manager");
  const values = readValues(formData);
  const plate = normalizePlate(values.plate);
  const errors: CarErrors = {};
  const plateError = checkPlate(plate);
  if (plateError) errors.plate = plateError;
  const details = parseDetails(values, errors);
  if (Object.keys(errors).length) return { ok: false, errors, values };

  try {
    await transaction(async (client) => {
      const car = await client.query<{ id: number }>(
        "INSERT INTO cars (plate, name, fuel_type, tank_litres) VALUES ($1, $2, $3, $4) RETURNING id",
        [plate, details.name, details.fuelType, details.tank],
      );
      if (details.reading) {
        await client.query(
          `INSERT INTO fuel_readings (car_id, recorded_by, odometer_km, gauge_eighths) VALUES ($1, $2, $3, $4)`,
          [car.rows[0].id, manager.id, details.reading.odometer, details.reading.eighths],
        );
      }
    });
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return { ok: false, errors: { plate: `Gari lenye namba ${plate} tayari lipo.` }, values };
    }
    throw err;
  }
  await refreshCars();
  return saved(plate, details, details.reading !== null, "limeongezwa");
}

// Aina, fuel type and tank can change any time. The starting reading is only taken here while the
// car has none; later readings go on Mafuta, where they are checked against the last one. The plate
// stays, since the driver signs in with it.
export async function updateCar(_prev: CarFormState, formData: FormData): Promise<CarFormState> {
  const manager = await requireUser("manager");
  const carId = Number(formData.get("carId"));
  const values = readValues(formData);
  const errors: CarErrors = {};
  const details = parseDetails(values, errors);
  if (!Number.isInteger(carId)) errors.car = "Gari hilo halipo tena.";
  if (Object.keys(errors).length) return { ok: false, errors, values };

  const result = await transaction(async (client) => {
    const car = await client.query<{ plate: string; driver_id: number | null; measured: boolean }>(
      `SELECT plate, driver_id, EXISTS (SELECT 1 FROM fuel_readings WHERE car_id = cars.id) AS measured
         FROM cars WHERE id = $1 FOR UPDATE`,
      [carId],
    );
    const row = car.rows[0];
    if (!row) return null;
    await client.query("UPDATE cars SET name = $2, fuel_type = $3, tank_litres = $4 WHERE id = $1", [
      carId,
      details.name,
      details.fuelType,
      details.tank,
    ]);
    if (details.reading && !row.measured) {
      await client.query(
        `INSERT INTO fuel_readings (car_id, driver_id, recorded_by, odometer_km, gauge_eighths) VALUES ($1, $2, $3, $4, $5)`,
        [carId, row.driver_id, manager.id, details.reading.odometer, details.reading.eighths],
      );
    }
    return { plate: row.plate, measured: row.measured || details.reading !== null };
  });
  if (!result) return { ok: false, errors: { car: "Gari hilo halipo tena." }, values };
  await refreshCars();
  return saved(result.plate, details, result.measured, "limehifadhiwa");
}

// Assigning a driver who already has a car moves them to this one. The driver who
// loses this car is signed out, since their plate no longer signs them in.
export async function assignDriver(formData: FormData) {
  await requireUser("manager");
  const carId = Number(formData.get("carId"));
  const raw = String(formData.get("driverId") ?? "");
  const driverId = raw === "" ? null : Number(raw);
  if (!Number.isInteger(carId) || (driverId !== null && !Number.isInteger(driverId))) return;

  await transaction(async (client) => {
    const previous = await client.query<{ driver_id: number | null }>(
      "SELECT driver_id FROM cars WHERE id = $1 FOR UPDATE",
      [carId],
    );
    const previousDriver = previous.rows[0]?.driver_id;
    if (driverId !== null) {
      const { rowCount } = await client.query("SELECT 1 FROM users WHERE id = $1 AND role = 'driver'", [driverId]);
      if (!rowCount) return;
      await client.query("UPDATE cars SET driver_id = NULL WHERE driver_id = $1 AND id <> $2", [driverId, carId]);
    }
    await client.query("UPDATE cars SET driver_id = $1 WHERE id = $2", [driverId, carId]);
    if (driverId !== null) await claimDriverlessReading(client, carId, driverId);
    if (previousDriver && previousDriver !== driverId) {
      await client.query("DELETE FROM sessions WHERE user_id = $1", [previousDriver]);
    }
  });
  revalidatePath("/manager", "layout");
  revalidatePath("/driver");
}
