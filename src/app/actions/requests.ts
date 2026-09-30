"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { driverChannel, MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { MAX_ISSUE_NOTE_LENGTH, parseCarChoice, parseMoneyRequest, type RequestErrors } from "@/lib/validation";

export type RequestFormState =
  | { ok: true }
  | { ok: false; errors: RequestErrors & { carId?: string }; values: { amount: string; reason: string; carId?: string } }
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
    `INSERT INTO money_requests (requester_id, car_id, amount, reason)
     VALUES ($1, (SELECT id FROM cars WHERE driver_id = $1), $2, $3)`,
    [driver.id, parsed.amount, parsed.reason],
  );
  revalidatePath("/driver");
  revalidatePath("/manager", "layout");
  await notify([MANAGERS_CHANNEL]);
  return { ok: true };
}

// A manager's own request is approved as it's made and goes straight to the mhasibu.
export async function createManagerRequest(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const manager = await requireUser("manager");
  const values = {
    amount: String(formData.get("amount") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    carId: String(formData.get("carId") ?? ""),
  };
  const parsed = parseMoneyRequest(values);
  const car = parseCarChoice(values.carId);
  if (!parsed.ok || "error" in car) {
    return {
      ok: false,
      errors: { ...(parsed.ok ? {} : parsed.errors), ...("error" in car ? { carId: car.error } : {}) },
      values,
    };
  }

  const inserted = await query(
    `INSERT INTO money_requests (requester_id, car_id, amount, reason, status, reviewed_by, reviewed_at)
     SELECT $1, $2::int, $3, $4, 'approved', $1, now()
      WHERE $2::int IS NULL OR EXISTS (SELECT 1 FROM cars WHERE id = $2::int)
     RETURNING id`,
    [manager.id, car.carId, parsed.amount, parsed.reason],
  );
  if (inserted.length === 0) {
    return { ok: false, errors: { carId: "Gari hilo halipo tena. Chagua jingine." }, values };
  }
  revalidatePath("/manager", "layout");
  revalidatePath("/accountant", "layout");
  revalidatePath("/director", "layout");
  await notify([MANAGERS_CHANNEL]);
  return { ok: true };
}

export async function reviewRequest(formData: FormData) {
  const manager = await requireUser("manager");
  const id = Number(formData.get("id"));
  const decision = formData.get("decision");
  if (!Number.isInteger(id) || (decision !== "approved" && decision !== "rejected")) return;

  // Only pending requests can be reviewed, so a double click or a second manager is a no-op.
  const updated = await query<{ requester_id: number }>(
    `UPDATE money_requests SET status = $2, reviewed_by = $3, reviewed_at = now()
      WHERE id = $1 AND status = 'pending' RETURNING requester_id`,
    [id, decision, manager.id],
  );
  revalidatePath("/manager", "layout");
  revalidatePath("/driver");
  // Tell the driver, and other managers looking at the same list.
  if (updated[0]) await notify([driverChannel(updated[0].requester_id), MANAGERS_CHANNEL]);
}

// The mhasibu pays out an approved request, with an optional note such as an M-Pesa reference.
// Only unpaid approved requests match, so a double tap or a second mhasibu is a no-op.
export async function issueRequest(formData: FormData) {
  const accountant = await requireUser("accountant");
  const id = Number(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim().slice(0, MAX_ISSUE_NOTE_LENGTH) || null;
  if (!Number.isInteger(id)) return;

  const issued = await query<{ requester_id: number }>(
    `UPDATE money_requests SET issued_at = now(), issued_by = $2, issue_note = $3
      WHERE id = $1 AND status = 'approved' AND issued_at IS NULL RETURNING requester_id`,
    [id, accountant.id, note],
  );
  revalidatePath("/accountant", "layout");
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  revalidatePath("/driver", "layout");
  if (issued[0]) await notify([driverChannel(issued[0].requester_id), MANAGERS_CHANNEL]);
}
