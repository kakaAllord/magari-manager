"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { query, transaction } from "@/lib/db";
import { MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { checkEmail, checkNewPassword } from "@/lib/validation";

export type ManagerFormState = { ok: boolean; message: string } | undefined;

const UNIQUE_VIOLATION = "23505";

// Staff the director manages: managers and the mhasibu. Both sign in with email.
const STAFF_ROLES = ["manager", "accountant"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];
const isStaffRole = (role: unknown): role is StaffRole => STAFF_ROLES.includes(role as StaffRole);

export async function createManager(_prev: ManagerFormState, formData: FormData): Promise<ManagerFormState> {
  await requireUser("director");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role");

  if (!isStaffRole(role)) return { ok: false, message: "Chagua kama ni meneja au mhasibu." };
  if (name.length < 2) return { ok: false, message: "Andika jina lake." };
  const error = checkEmail(email) ?? checkNewPassword(password);
  if (error) return { ok: false, message: error };

  try {
    await query("INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)", [
      name,
      email,
      await bcrypt.hash(password, 10),
      role,
    ]);
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return { ok: false, message: `Barua pepe ${email} tayari inatumika.` };
    }
    throw err;
  }
  revalidatePath("/director", "layout");
  await notify([MANAGERS_CHANNEL]);
  const as = role === "manager" ? "meneja" : "mhasibu";
  return { ok: true, message: `${name} ameongezwa kama ${as}. Ataingia kwa ${email} na nenosiri ulilochagua.` };
}

// Setting a new password also signs the person out everywhere.
export async function setManagerPassword(_prev: ManagerFormState, formData: FormData): Promise<ManagerFormState> {
  await requireUser("director");
  const managerId = Number(formData.get("managerId"));
  const password = String(formData.get("password") ?? "");
  const passwordError = checkNewPassword(password);
  if (passwordError) return { ok: false, message: passwordError };
  if (!Number.isInteger(managerId)) return { ok: false, message: "Mfanyakazi hajulikani." };

  const hash = await bcrypt.hash(password, 10);
  const updated = await transaction(async (client) => {
    const { rowCount } = await client.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2 AND role IN ('manager', 'accountant')",
      [hash, managerId],
    );
    await client.query("DELETE FROM sessions WHERE user_id = $1", [managerId]);
    return rowCount;
  });
  if (!updated) return { ok: false, message: "Mfanyakazi hajulikani." };
  return { ok: true, message: "Nenosiri jipya limehifadhiwa. Mpe mwenyewe." };
}

// Switching someone off signs them out and blocks sign-in; their past decisions, payouts and income keep their name.
export async function setManagerActive(_prev: ManagerFormState, formData: FormData): Promise<ManagerFormState> {
  await requireUser("director");
  const managerId = Number(formData.get("managerId"));
  const active = formData.get("active") === "1";
  if (!Number.isInteger(managerId)) return { ok: false, message: "Mfanyakazi hajulikani." };

  const updated = await transaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE users SET deactivated_at = CASE WHEN $2 THEN NULL ELSE coalesce(deactivated_at, now()) END
        WHERE id = $1 AND role IN ('manager', 'accountant')`,
      [managerId, active],
    );
    if (!active) await client.query("DELETE FROM sessions WHERE user_id = $1", [managerId]);
    return rowCount;
  });
  if (!updated) return { ok: false, message: "Mfanyakazi hajulikani." };
  revalidatePath("/director", "layout");
}
