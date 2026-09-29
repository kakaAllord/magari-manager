"use server";

import { revalidatePath } from "next/cache";
import { query, transaction } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { checkPlate, normalizePlate } from "@/lib/validation";

export type CarFormState = { ok: boolean; message: string } | undefined;

const UNIQUE_VIOLATION = "23505";

export async function createCar(_prev: CarFormState, formData: FormData): Promise<CarFormState> {
  await requireUser("manager");
  const plate = normalizePlate(String(formData.get("plate") ?? ""));
  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const plateError = checkPlate(plate);
  if (plateError) return { ok: false, message: plateError };
  if (!make || !model) return { ok: false, message: "Make and model are both required." };

  try {
    await query("INSERT INTO cars (plate, make, model) VALUES ($1, $2, $3)", [plate, make, model]);
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return { ok: false, message: `A car with plate ${plate} already exists.` };
    }
    throw err;
  }
  revalidatePath("/manager/cars");
  return { ok: true, message: `Added ${make} ${model}.` };
}

// Assigning a driver who already has a car moves them to this one.
export async function assignDriver(formData: FormData) {
  await requireUser("manager");
  const carId = Number(formData.get("carId"));
  const raw = String(formData.get("driverId") ?? "");
  const driverId = raw === "" ? null : Number(raw);
  if (!Number.isInteger(carId) || (driverId !== null && !Number.isInteger(driverId))) return;

  await transaction(async (client) => {
    if (driverId !== null) {
      const { rowCount } = await client.query("SELECT 1 FROM users WHERE id = $1 AND role = 'driver'", [driverId]);
      if (!rowCount) return;
      await client.query("UPDATE cars SET driver_id = NULL WHERE driver_id = $1 AND id <> $2", [driverId, carId]);
    }
    await client.query("UPDATE cars SET driver_id = $1 WHERE id = $2", [driverId, carId]);
  });
  revalidatePath("/manager/cars");
  revalidatePath("/driver");
}
