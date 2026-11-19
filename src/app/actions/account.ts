"use server";

import { getT } from "@/lib/lang";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { deleteOtherSessions, requireWriter } from "@/lib/session";
import { checkNewPassword } from "@/lib/validation";

export type PasswordFormState = { ok: boolean; message: string } | undefined;

// Anyone signed in can change their own password with their current one; other devices are signed out.
export async function changeOwnPassword(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const user = await requireWriter();
  const t = await getT();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");

  const error = checkNewPassword(next, t);
  if (error) return { ok: false, message: error };

  const [row] = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) {
    return { ok: false, message: t("Nenosiri la sasa si sahihi.", "The current password is wrong.") };
  }
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(next, 10), user.id]);
  await deleteOtherSessions(user.id);
  return { ok: true, message: t("Nenosiri jipya limehifadhiwa. Tumia hilo utakapoingia tena.", "New password saved. Use it next time you sign in.") };
}
