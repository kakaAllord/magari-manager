"use server";

import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { homeFor, requireDev, setImpersonation, type Role } from "@/lib/session";

// Start viewing the app as another user. Only a dev gets this far (requireDev), and the target must
// exist and not be another dev. It redirects into that user's own area, where the app behaves exactly
// as them — no banner, no record, nothing the person would see.
export async function impersonate(formData: FormData) {
  await requireDev();
  const targetId = Number(formData.get("userId"));
  if (!Number.isInteger(targetId)) redirect("/dev");
  const target = (await query<{ role: Role }>("SELECT role FROM users WHERE id = $1 AND role <> 'dev'", [targetId]))[0];
  if (!target) redirect("/dev");
  await setImpersonation(targetId);
  redirect(homeFor(target.role));
}

// Stop impersonating and return to the dev console.
export async function stopImpersonating() {
  await requireDev();
  await setImpersonation(null);
  redirect("/dev");
}
