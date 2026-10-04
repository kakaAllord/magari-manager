"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, transaction } from "@/lib/db";
import { MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { homeFor, requireUser } from "@/lib/session";
import { staffAddedBy, staffLabel, staffManagedBy, type StaffRole } from "@/lib/staff";
import { checkEmail, checkNewPassword } from "@/lib/validation";

export type ManagerFormState = { ok: boolean; message: string } | undefined;

const UNIQUE_VIOLATION = "23505";

// The signed-in person and the roles they may add (or manage); anyone else is sent home.
async function staffRoles(table: typeof staffAddedBy) {
  const user = await requireUser();
  const roles = table[user.role];
  if (!roles) redirect(homeFor(user.role));
  return { user, roles };
}

const refresh = () => {
  revalidatePath("/director", "layout");
  revalidatePath("/factory", "layout");
};

export async function createManager(_prev: ManagerFormState, formData: FormData): Promise<ManagerFormState> {
  const { user, roles } = await staffRoles(staffAddedBy);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") as StaffRole;

  if (!roles.includes(role)) return { ok: false, message: "Chagua nafasi yake." };
  if (name.length < 2) return { ok: false, message: "Andika jina lake." };
  const error = checkEmail(email) ?? checkNewPassword(password);
  if (error) return { ok: false, message: error };

  try {
    await query("INSERT INTO users (name, email, password_hash, role, added_by) VALUES ($1, $2, $3, $4, $5)", [
      name,
      email,
      await bcrypt.hash(password, 10),
      role,
      user.id,
    ]);
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return { ok: false, message: `Barua pepe ${email} tayari inatumika.` };
    }
    throw err;
  }
  refresh();
  await notify([MANAGERS_CHANNEL]);
  return {
    ok: true,
    message: `${name} ameongezwa kama ${staffLabel[role].toLowerCase()}. Ataingia kwa ${email} na nenosiri ulilochagua.`,
  };
}

// Setting a new password also signs the person out everywhere.
export async function setManagerPassword(_prev: ManagerFormState, formData: FormData): Promise<ManagerFormState> {
  const { roles } = await staffRoles(staffManagedBy);
  const managerId = Number(formData.get("managerId"));
  const password = String(formData.get("password") ?? "");
  const passwordError = checkNewPassword(password);
  if (passwordError) return { ok: false, message: passwordError };
  if (!Number.isInteger(managerId)) return { ok: false, message: "Mfanyakazi hajulikani." };

  const hash = await bcrypt.hash(password, 10);
  const updated = await transaction(async (client) => {
    const { rowCount } = await client.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2 AND role = ANY($3::text[])",
      [hash, managerId, roles],
    );
    if (rowCount) await client.query("DELETE FROM sessions WHERE user_id = $1", [managerId]);
    return rowCount;
  });
  if (!updated) return { ok: false, message: "Mfanyakazi hajulikani." };
  return { ok: true, message: "Nenosiri jipya limehifadhiwa. Mpe mwenyewe." };
}

// Switching someone off signs them out and blocks sign-in; their past decisions, payouts and income keep their name.
export async function setManagerActive(_prev: ManagerFormState, formData: FormData): Promise<ManagerFormState> {
  const { roles } = await staffRoles(staffManagedBy);
  const managerId = Number(formData.get("managerId"));
  const active = formData.get("active") === "1";
  if (!Number.isInteger(managerId)) return { ok: false, message: "Mfanyakazi hajulikani." };

  const updated = await transaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE users SET deactivated_at = CASE WHEN $2 THEN NULL ELSE coalesce(deactivated_at, now()) END
        WHERE id = $1 AND role = ANY($3::text[])`,
      [managerId, active, roles],
    );
    if (rowCount && !active) await client.query("DELETE FROM sessions WHERE user_id = $1", [managerId]);
    return rowCount;
  });
  if (!updated) return { ok: false, message: "Mfanyakazi hajulikani." };
  refresh();
}
