"use server";

import { getT } from "@/lib/lang";
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
  const t = await getT();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") as StaffRole;

  if (!roles.includes(role)) return { ok: false, message: t("Chagua nafasi yake.", "Pick their position.") };
  if (name.length < 2) return { ok: false, message: t("Andika jina lake.", "Write their name.") };
  const error = checkEmail(email, t) ?? checkNewPassword(password, t);
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
      return { ok: false, message: t(`Barua pepe ${email} tayari inatumika.`, `The email ${email} is already in use.`) };
    }
    throw err;
  }
  refresh();
  await notify([MANAGERS_CHANNEL]);
  return {
    ok: true,
    message: t(
      `${name} ameongezwa kama ${staffLabel(role, t).toLowerCase()}. Ataingia kwa ${email} na nenosiri ulilochagua.`,
      `${name} was added as ${staffLabel(role, t).toLowerCase()}. They sign in with ${email} and the password you chose.`,
    ),
  };
}

// Setting a new password also signs the person out everywhere.
export async function setManagerPassword(_prev: ManagerFormState, formData: FormData): Promise<ManagerFormState> {
  const { roles } = await staffRoles(staffManagedBy);
  const t = await getT();
  const managerId = Number(formData.get("managerId"));
  const password = String(formData.get("password") ?? "");
  const passwordError = checkNewPassword(password, t);
  if (passwordError) return { ok: false, message: passwordError };
  if (!Number.isInteger(managerId)) return { ok: false, message: t("Mfanyakazi hajulikani.", "Unknown staff member.") };

  const hash = await bcrypt.hash(password, 10);
  const updated = await transaction(async (client) => {
    const { rowCount } = await client.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2 AND role = ANY($3::text[])",
      [hash, managerId, roles],
    );
    if (rowCount) await client.query("DELETE FROM sessions WHERE user_id = $1", [managerId]);
    return rowCount;
  });
  if (!updated) return { ok: false, message: t("Mfanyakazi hajulikani.", "Unknown staff member.") };
  return { ok: true, message: t("Nenosiri jipya limehifadhiwa. Mpe mwenyewe.", "New password saved. Give it to them in person.") };
}

// Staff can no longer be switched off from the app. Anyone switched off before that can be switched back on,
// with their old password; until then they can't sign in.
export async function reactivateStaff(_prev: ManagerFormState, formData: FormData): Promise<ManagerFormState> {
  const { roles } = await staffRoles(staffManagedBy);
  const t = await getT();
  const managerId = Number(formData.get("managerId"));
  if (!Number.isInteger(managerId)) return { ok: false, message: t("Mfanyakazi hajulikani.", "Unknown staff member.") };

  const updated = await query("UPDATE users SET deactivated_at = NULL WHERE id = $1 AND role = ANY($2::text[]) RETURNING id", [
    managerId,
    roles,
  ]);
  if (!updated.length) return { ok: false, message: t("Mfanyakazi hajulikani.", "Unknown staff member.") };
  refresh();
}
