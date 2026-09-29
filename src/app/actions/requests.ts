"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { driverChannel, MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { parseMoneyRequest, type RequestErrors } from "@/lib/validation";

export type RequestFormState =
  | { ok: true }
  | { ok: false; errors: RequestErrors; values: { amount: string; reason: string } }
  | undefined;

export async function createRequest(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const driver = await requireUser("driver");
  const values = {
    amount: String(formData.get("amount") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  };
  const parsed = parseMoneyRequest(values);
  if (!parsed.ok) return { ok: false, errors: parsed.errors, values };

  await query(
    `INSERT INTO money_requests (driver_id, car_id, amount, reason)
     VALUES ($1, (SELECT id FROM cars WHERE driver_id = $1), $2, $3)`,
    [driver.id, parsed.amount, parsed.reason],
  );
  revalidatePath("/driver");
  revalidatePath("/manager", "layout");
  await notify([MANAGERS_CHANNEL]);
  return { ok: true };
}

export async function reviewRequest(formData: FormData) {
  const manager = await requireUser("manager");
  const id = Number(formData.get("id"));
  const decision = formData.get("decision");
  if (!Number.isInteger(id) || (decision !== "approved" && decision !== "rejected")) return;

  // Only pending requests can be reviewed, so a double click or a second manager is a no-op.
  const updated = await query<{ driver_id: number }>(
    `UPDATE money_requests SET status = $2, reviewed_by = $3, reviewed_at = now()
      WHERE id = $1 AND status = 'pending' RETURNING driver_id`,
    [id, decision, manager.id],
  );
  revalidatePath("/manager", "layout");
  revalidatePath("/driver");
  // Tell the driver, and other managers looking at the same list.
  if (updated[0]) await notify([driverChannel(updated[0].driver_id), MANAGERS_CHANNEL]);
}
