"use server";

import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { deleteOtherSessions, requireUser } from "@/lib/session";
import { checkNewPassword } from "@/lib/validation";

export type PasswordFormState = { ok: boolean; message: string } | undefined;

// Anyone signed in can change their own password; other devices are signed out.
export async function changeOwnPassword(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  const error = checkNewPassword(next) ?? (next !== repeat ? "Nenosiri jipya na la kurudia hayafanani." : undefined);
  if (error) return { ok: false, message: error };

  const [row] = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) {
    return { ok: false, message: "Nenosiri la sasa si sahihi." };
  }
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(next, 10), user.id]);
  await deleteOtherSessions(user.id);
  return { ok: true, message: "Nenosiri jipya limehifadhiwa. Tumia hilo utakapoingia tena." };
}
