"use server";

import { revalidatePath } from "next/cache";
import { claimDriverlessReading, transaction } from "@/lib/db";
import { MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import {
  checkPlate,
  normalizePlate,
  parseStartingReading,
  parseTankLitres,
  type ReadingErrors,
} from "@/lib/validation";

type CarValues = { plate: string; make: string; model: string; fuelType: string; tank: string; odometer: string; gauge: string };
type CarErrors = ReadingErrors & { plate?: string; car?: string; tank?: string };

export type CarFormState =
  | { ok: true; message: string; measured: boolean }
  | { ok: false; errors: CarErrors; values: CarValues }
  | undefined;

const UNIQUE_VIOLATION = "23505";

// A new car with its fuel type and tank size, and optionally what its odometer and gauge read now.
// That reading is the base fuel is measured from, so no fuel can be asked for the car without one;
// it can also be recorded later on Mafuta.
export async function createCar(_prev: CarFormState, formData: FormData): Promise<CarFormState> {
  const manager = await requireUser("manager");
  const values: CarValues = {
    plate: String(formData.get("plate") ?? ""),
    make: String(formData.get("make") ?? "").trim(),
    model: String(formData.get("model") ?? "").trim(),
    fuelType: formData.get("fuelType") === "diesel" ? "diesel" : "petrol",
    tank: String(formData.get("tank") ?? "").trim(),
    odometer: String(formData.get("odometer") ?? ""),
    gauge: String(formData.get("gauge") ?? ""),
  };
  const plate = normalizePlate(values.plate);
  const errors: CarErrors = {};
  const plateError = checkPlate(plate);
  if (plateError) errors.plate = plateError;
  if (!values.make || !values.model) errors.car = "Andika aina na modeli ya gari.";
  const tank = values.tank ? parseTankLitres(values.tank) : { litres: null };
  if ("error" in tank) errors.tank = tank.error;
  const start = parseStartingReading(values);
  if (!start.ok) Object.assign(errors, start.errors);
  if (Object.keys(errors).length || !start.ok || "error" in tank) return { ok: false, errors, values };

  try {
    await transaction(async (client) => {
      const car = await client.query<{ id: number }>(
        "INSERT INTO cars (plate, make, model, fuel_type, tank_litres) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [plate, values.make, values.model, values.fuelType, tank.litres],
      );
      if (start.reading) {
        // Nobody drives it yet; the first driver it's given to takes this reading over.
        await client.query(
          `INSERT INTO fuel_readings (car_id, recorded_by, odometer_km, gauge_eighths) VALUES ($1, $2, $3, $4)`,
          [car.rows[0].id, manager.id, start.reading.odometer, start.reading.eighths],
        );
      }
    });
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return { ok: false, errors: { plate: `Gari lenye namba ${plate} tayari lipo.` }, values };
    }
    throw err;
  }
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  await notify([MANAGERS_CHANNEL]);
  return {
    ok: true,
    measured: start.reading !== null,
    message: start.reading
      ? `${values.make} ${values.model} (${plate}) limeongezwa pamoja na kipimo chake cha mafuta.`
      : `${values.make} ${values.model} (${plate}) limeongezwa. Rekodi kipimo cha mafuta kabla ya kuomba mafuta.`,
  };
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
