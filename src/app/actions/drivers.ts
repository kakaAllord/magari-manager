"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { transaction } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { checkNewPassword } from "@/lib/validation";

export type DriverFormState = { ok: boolean; message: string } | undefined;

export async function createDriver(_prev: DriverFormState, formData: FormData): Promise<DriverFormState> {
  await requireUser("manager");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rawCar = String(formData.get("carId") ?? "");
  const carId = rawCar === "" ? null : Number(rawCar);

  if (name.length < 2) return { ok: false, message: "Enter the driver's name." };
  const passwordError = checkNewPassword(password);
  if (passwordError) return { ok: false, message: passwordError };

  const hash = await bcrypt.hash(password, 10);
  const plate = await transaction(async (client) => {
    const { rows } = await client.query<{ id: number }>(
      "INSERT INTO users (name, password_hash, role) VALUES ($1, $2, 'driver') RETURNING id",
      [name, hash],
    );
    if (carId === null) return null;
    const car = await client.query<{ plate: string }>(
      "UPDATE cars SET driver_id = $1 WHERE id = $2 AND driver_id IS NULL RETURNING plate",
      [rows[0].id, carId],
    );
    if (!car.rowCount) throw new CarTakenError();
    return car.rows[0].plate;
  }).catch((err) => {
    if (err instanceof CarTakenError) return err;
    throw err;
  });

  if (plate instanceof CarTakenError) {
    return { ok: false, message: "That car already has a driver. Pick another car or refresh the page." };
  }
  revalidatePath("/manager", "layout");
  return {
    ok: true,
    message: plate
      ? `Added ${name}. They sign in with plate ${plate} and the password you chose.`
      : `Added ${name}. Assign them a car on the Cars page so they can sign in.`,
  };
}

class CarTakenError extends Error {}

// Setting a new password also signs the driver out everywhere.
export async function setDriverPassword(_prev: DriverFormState, formData: FormData): Promise<DriverFormState> {
  await requireUser("manager");
  const driverId = Number(formData.get("driverId"));
  const password = String(formData.get("password") ?? "");
  const passwordError = checkNewPassword(password);
  if (passwordError) return { ok: false, message: passwordError };
  if (!Number.isInteger(driverId)) return { ok: false, message: "Unknown driver." };

  const hash = await bcrypt.hash(password, 10);
  const updated = await transaction(async (client) => {
    const { rowCount } = await client.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2 AND role = 'driver'",
      [hash, driverId],
    );
    await client.query("DELETE FROM sessions WHERE user_id = $1", [driverId]);
    return rowCount;
  });
  if (!updated) return { ok: false, message: "Unknown driver." };
  return { ok: true, message: "New password saved. Give it to the driver." };
}
