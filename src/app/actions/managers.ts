"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { query, transaction } from "@/lib/db";
import { MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { checkEmail, checkNewPassword } from "@/lib/validation";

export type ManagerFormState = { ok: boolean; message: string } | undefined;

const UNIQUE_VIOLATION = "23505";

export async function createManager(_prev: ManagerFormState, formData: FormData): Promise<ManagerFormState> {
  await requireUser("director");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { ok: false, message: "Andika jina la meneja." };
  const error = checkEmail(email) ?? checkNewPassword(password);
  if (error) return { ok: false, message: error };

  try {
    await query("INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'manager')", [
      name,
      email,
      await bcrypt.hash(password, 10),
    ]);
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return { ok: false, message: `Barua pepe ${email} tayari inatumika.` };
    }
    throw err;
  }
  revalidatePath("/director", "layout");
  await notify([MANAGERS_CHANNEL]);
  return { ok: true, message: `${name} ameongezwa. Ataingia kwa ${email} na nenosiri ulilochagua.` };
}

// Setting a new password also signs the manager out everywhere.
export async function setManagerPassword(_prev: ManagerFormState, formData: FormData): Promise<ManagerFormState> {
  await requireUser("director");
  const managerId = Number(formData.get("managerId"));
  const password = String(formData.get("password") ?? "");
  const passwordError = checkNewPassword(password);
  if (passwordError) return { ok: false, message: passwordError };
  if (!Number.isInteger(managerId)) return { ok: false, message: "Meneja hajulikani." };

  const hash = await bcrypt.hash(password, 10);
  const updated = await transaction(async (client) => {
    const { rowCount } = await client.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2 AND role = 'manager'",
      [hash, managerId],
    );
    await client.query("DELETE FROM sessions WHERE user_id = $1", [managerId]);
    return rowCount;
  });
  if (!updated) return { ok: false, message: "Meneja hajulikani." };
  return { ok: true, message: "Nenosiri jipya limehifadhiwa. Mpe meneja." };
}
