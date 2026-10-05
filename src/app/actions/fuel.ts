"use server";

import { revalidatePath } from "next/cache";
import { query, transaction } from "@/lib/db";
import { MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import {
  checkOdometer,
  parseReading,
  parseTankLitres,
  type ReadingErrors,
} from "@/lib/validation";

export type ReadingFormState =
  | { ok: true; message: string; savedAt: number }
  | { ok: false; errors: ReadingErrors & { carId?: string }; values: { carId: string; odometer: string; gauge: string } }
  | undefined;

const refresh = async () => {
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  revalidatePath("/driver", "layout");
  await notify([MANAGERS_CHANNEL]);
};

// A manager's reading starts tracking a car, or marks a handover: it belongs to whoever drives the
// car now, so give the car to its new driver first. Managers may record any odometer at or above
// the last one, without the driver's limit on how far it jumps.
export async function recordReading(_prev: ReadingFormState, formData: FormData): Promise<ReadingFormState> {
  const manager = await requireUser("manager");
  const values = {
    carId: String(formData.get("carId") ?? ""),
    odometer: String(formData.get("odometer") ?? ""),
    gauge: String(formData.get("gauge") ?? ""),
  };
  const carId = Number(values.carId);
  const parsed = parseReading(values);
  const carError = Number.isInteger(carId) && carId > 0 ? undefined : "Chagua gari.";
  if (!parsed.ok || carError) {
    return { ok: false, errors: { ...(parsed.ok ? {} : parsed.errors), carId: carError }, values };
  }

  type Outcome = { error: ReadingErrors & { carId?: string } } | { plate: string };
  const result = await transaction(async (client): Promise<Outcome> => {
    // Locking the car keeps two readings from racing past the odometer check.
    const car = await client.query<{ plate: string; driver_id: number | null }>(
      "SELECT plate, driver_id FROM cars WHERE id = $1 FOR UPDATE",
      [carId],
    );
    if (!car.rows[0]) return { error: { carId: "Gari hilo halipo tena." } };
    const last = await client.query<{ odometer_km: number }>(
      "SELECT odometer_km FROM fuel_readings WHERE car_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1",
      [carId],
    );
    const odometerError = checkOdometer(parsed.odometer, last.rows[0]?.odometer_km ?? null, false);
    if (odometerError) return { error: { odometer: odometerError } };
    await client.query(
      `INSERT INTO fuel_readings (car_id, driver_id, recorded_by, odometer_km, gauge_eighths)
       VALUES ($1, $2, $3, $4, $5)`,
      [carId, car.rows[0].driver_id, manager.id, parsed.odometer, parsed.eighths],
    );
    return { plate: car.rows[0].plate };
  });
  if ("error" in result) return { ok: false, errors: result.error, values };
  await refresh();
  return { ok: true, message: `Kipimo cha ${result.plate} kimehifadhiwa.`, savedAt: Date.now() };
}

// Only a car's latest reading can go, so a typo can be fixed without rewriting history.
export async function deleteLatestReading(formData: FormData) {
  await requireUser("manager");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await query(
    `DELETE FROM fuel_readings r
      WHERE r.id = $1
        AND NOT EXISTS (SELECT 1 FROM fuel_readings n
                         WHERE n.car_id = r.car_id AND (n.created_at, n.id) > (r.created_at, r.id))`,
    [id],
  );
  await refresh();
}

export type SettingsState = { ok: boolean; message: string } | undefined;

export async function saveTank(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireUser("manager");
  const carId = Number(formData.get("carId"));
  const fuelType = formData.get("fuelType");
  const tank = parseTankLitres(String(formData.get("tank") ?? ""));
  if (!Number.isInteger(carId) || (fuelType !== "petrol" && fuelType !== "diesel")) {
    return { ok: false, message: "Chagua aina ya mafuta." };
  }
  if ("error" in tank) return { ok: false, message: tank.error };
  await query("UPDATE cars SET fuel_type = $2, tank_litres = $3 WHERE id = $1", [carId, fuelType, tank.litres]);
  await refresh();
  return { ok: true, message: "Imehifadhiwa." };
}
