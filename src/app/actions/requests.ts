"use server";

import { revalidatePath } from "next/cache";
import { query, transaction } from "@/lib/db";
import { driverChannel, MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { TIME_ZONE } from "@/lib/time";
import {
  checkOdometer,
  checkReceiptImage,
  MAX_ISSUE_NOTE_LENGTH,
  parseCarChoice,
  parseEntryDate,
  parseMoneyRequest,
  parseReading,
  type ReadingErrors,
  type RequestErrors,
} from "@/lib/validation";

type FormErrors = RequestErrors & ReadingErrors & { carId?: string; kind?: string; date?: string };
type FormValues = {
  kind: string;
  amount: string;
  reason: string;
  carId?: string;
  odometer?: string;
  gauge?: string;
  date?: string;
};

export type RequestFormState =
  | { ok: true; backfilled?: boolean }
  | { ok: false; errors: FormErrors; values: FormValues }
  | undefined;

// A fuel request may leave the reason empty; it then just says "Mafuta".
const readKind = (formData: FormData) => (formData.get("kind") === "fuel" ? "fuel" : "other");
const reasonFor = (kind: string, reason: string) => (kind === "fuel" && !reason.trim() ? "Mafuta" : reason);

export async function createRequest(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const driver = await requireUser("driver");
  const kind = readKind(formData);
  const values: FormValues = {
    kind,
    amount: String(formData.get("amount") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    odometer: String(formData.get("odometer") ?? ""),
    gauge: String(formData.get("gauge") ?? ""),
  };
  const parsed = parseMoneyRequest({ amount: values.amount, reason: reasonFor(kind, values.reason) });
  const reading = kind === "fuel" ? parseReading({ odometer: values.odometer!, gauge: values.gauge! }) : null;
  if (!parsed.ok || (reading && !reading.ok)) {
    return {
      ok: false,
      errors: { ...(parsed.ok ? {} : parsed.errors), ...(reading && !reading.ok ? reading.errors : {}) },
      values,
    };
  }

  if (!reading) {
    await query(
      `INSERT INTO money_requests (requester_id, car_id, amount, reason)
       VALUES ($1, (SELECT id FROM cars WHERE driver_id = $1), $2, $3)`,
      [driver.id, parsed.amount, parsed.reason],
    );
  } else {
    // The reading and the request go in together. Locking the car keeps a double tap from making two.
    const error = await transaction(async (client): Promise<FormErrors | null> => {
      const car = await client.query<{ id: number; fuel_type: string }>(
        "SELECT id, fuel_type FROM cars WHERE driver_id = $1 FOR UPDATE",
        [driver.id],
      );
      const carRow = car.rows[0];
      if (!carRow) return { kind: "Bado hujapewa gari, kwa hiyo huwezi kuomba mafuta." };
      const open = await client.query(
        `SELECT 1 FROM money_requests WHERE car_id = $1 AND kind = 'fuel'
            AND (status = 'pending' OR (status = 'approved' AND issued_at IS NULL))`,
        [carRow.id],
      );
      if (open.rowCount) {
        return { kind: "Gari lako lina ombi la mafuta ambalo bado halijalipwa. Subiri lilipwe au likataliwe." };
      }
      const last = await client.query<{ odometer_km: number }>(
        "SELECT odometer_km FROM fuel_readings WHERE car_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1",
        [carRow.id],
      );
      const odometerError = checkOdometer(reading.odometer, last.rows[0]?.odometer_km ?? null, true);
      if (odometerError) return { odometer: odometerError };
      const inserted = await client.query<{ id: number }>(
        `INSERT INTO money_requests (requester_id, car_id, amount, reason, kind, fuel_price)
         VALUES ($1, $2, $3, $4, 'fuel', (SELECT price_per_litre FROM fuel_prices WHERE fuel_type = $5))
         RETURNING id`,
        [driver.id, carRow.id, parsed.amount, parsed.reason, carRow.fuel_type],
      );
      await client.query(
        `INSERT INTO fuel_readings (car_id, driver_id, recorded_by, request_id, odometer_km, gauge_eighths)
         VALUES ($1, $2, $2, $3, $4, $5)`,
        [carRow.id, driver.id, inserted.rows[0].id, reading.odometer, reading.eighths],
      );
      return null;
    });
    if (error) return { ok: false, errors: error, values };
  }
  revalidatePath("/driver");
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  await notify([MANAGERS_CHANNEL]);
  return { ok: true };
}

// A manager's own request is approved as it's made and goes straight to the mhasibu. With a past
// date it is history instead: entered as already paid on that day, with no mhasibu or receipt step.
export async function createManagerRequest(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const manager = await requireUser("manager");
  const kind = readKind(formData);
  const values: FormValues = {
    kind,
    amount: String(formData.get("amount") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    carId: String(formData.get("carId") ?? ""),
    date: String(formData.get("date") ?? ""),
  };
  const parsed = parseMoneyRequest({ amount: values.amount, reason: reasonFor(kind, values.reason) });
  let car = parseCarChoice(values.carId!);
  if (kind === "fuel" && !("error" in car) && car.carId === null) car = { error: "Mafuta ni ya gari: chagua gari." };
  const date = parseEntryDate(values.date!, todayInTanzania());
  if (!parsed.ok || "error" in car || "error" in date) {
    return {
      ok: false,
      errors: {
        ...(parsed.ok ? {} : parsed.errors),
        ...("error" in car ? { carId: car.error } : {}),
        ...("error" in date ? { date: date.error } : {}),
      },
      values,
    };
  }

  // A manager's fuel has no reading: the driver's next one measures it. Past fuel uses today's
  // price per litre, the only one the app knows. History is dated midday that day.
  const inserted = await query(
    `WITH at AS (SELECT CASE WHEN $6::date IS NULL THEN now() ELSE ($6::date + time '12:00') AT TIME ZONE $7 END AS t)
     INSERT INTO money_requests (requester_id, car_id, amount, reason, status, reviewed_by, reviewed_at, kind, fuel_price,
                                 created_at, issued_at, backfilled_at)
     SELECT $1, $2::int, $3, $4, 'approved', $1, at.t, $5,
            CASE WHEN $5 = 'fuel' THEN (SELECT p.price_per_litre FROM cars c JOIN fuel_prices p ON p.fuel_type = c.fuel_type
                                         WHERE c.id = $2::int) END,
            at.t,
            CASE WHEN $6::date IS NULL THEN NULL ELSE at.t END,
            CASE WHEN $6::date IS NULL THEN NULL ELSE now() END
       FROM at
      WHERE $2::int IS NULL OR EXISTS (SELECT 1 FROM cars WHERE id = $2::int)
     RETURNING id`,
    [manager.id, car.carId, parsed.amount, parsed.reason, kind, date.date, TIME_ZONE],
  );
  if (inserted.length === 0) {
    return { ok: false, errors: { carId: "Gari hilo halipo tena. Chagua jingine." }, values };
  }
  revalidatePath("/manager", "layout");
  revalidatePath("/accountant", "layout");
  revalidatePath("/director", "layout");
  await notify([MANAGERS_CHANNEL]);
  return { ok: true, backfilled: date.date !== null };
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
// The payment then waits for its receipt.
export async function issueRequest(formData: FormData) {
  const accountant = await requireUser("accountant");
  const id = Number(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim().slice(0, MAX_ISSUE_NOTE_LENGTH) || null;
  if (!Number.isInteger(id)) return;

  const issued = await query<{ requester_id: number }>(
    `UPDATE money_requests SET issued_at = now(), issued_by = $2, issue_note = $3, receipt_due = true
      WHERE id = $1 AND status = 'approved' AND issued_at IS NULL RETURNING requester_id`,
    [id, accountant.id, note],
  );
  revalidatePath("/accountant", "layout");
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  revalidatePath("/driver", "layout");
  if (issued[0]) await notify([driverChannel(issued[0].requester_id), MANAGERS_CHANNEL]);
}

export type ReceiptState = { ok: boolean; message: string } | undefined;

// After the purchase, the mhasibu adds the receipt photo of a paid request, with an optional note
// such as the receipt number. The first receipt wins, so a double tap is a no-op.
export async function addReceipt(_prev: ReceiptState, formData: FormData): Promise<ReceiptState> {
  const accountant = await requireUser("accountant");
  const id = Number(formData.get("id"));
  const file = formData.get("receipt");
  const note = String(formData.get("note") ?? "").trim().slice(0, MAX_ISSUE_NOTE_LENGTH) || null;
  if (!Number.isInteger(id)) return { ok: false, message: "Ombi hilo halipo." };
  const bytes = file instanceof Blob ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array();
  const image = checkReceiptImage(bytes);
  if ("error" in image) return { ok: false, message: image.error };

  const added = await query<{ requester_id: number }>(
    `WITH r AS (SELECT id, requester_id FROM money_requests WHERE id = $1 AND receipt_due),
          ins AS (INSERT INTO receipts (request_id, content_type, data, note, uploaded_by)
                  SELECT id, $2, $3, $4, $5 FROM r
                  ON CONFLICT (request_id) DO NOTHING RETURNING request_id)
     SELECT r.requester_id FROM r JOIN ins ON ins.request_id = r.id`,
    [id, image.contentType, Buffer.from(bytes), note, accountant.id],
  );
  if (!added[0]) return { ok: false, message: "Risiti ya malipo haya imeshawekwa, au malipo hayapo." };
  revalidatePath("/accountant", "layout");
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  revalidatePath("/driver", "layout");
  await notify([driverChannel(added[0].requester_id), MANAGERS_CHANNEL]);
  return { ok: true, message: "Risiti imewekwa." };
}
