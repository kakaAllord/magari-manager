"use server";

import { revalidatePath } from "next/cache";
import { query, transaction } from "@/lib/db";
import { parseDuplicateOk, type DuplicateMatch } from "@/lib/duplicate-rules";
import { findRequestDuplicate } from "@/lib/duplicates";
import { missingForFuel } from "@/lib/fuel-ready";
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
  parseFuelOrder,
  parseMoneyRequest,
  parseReading,
  type ReadingErrors,
  type RequestErrors,
} from "@/lib/validation";

type FormErrors = RequestErrors &
  ReadingErrors & { carId?: string; kind?: string; date?: string; fuelPrice?: string; litres?: string };
type FormValues = {
  kind: string;
  amount: string;
  fuelPrice?: string;
  litres?: string;
  reason: string;
  carId?: string;
  odometer?: string;
  gauge?: string;
  date?: string;
};

export type RequestFormState =
  | { ok: true; backfilled?: boolean }
  | { ok: false; errors: FormErrors; values: FormValues; duplicate?: DuplicateMatch }
  | undefined;

const notReadyForDriver = (missing: string) => `Gari lako bado halina ${missing}. Mwombe meneja akamilishe kwanza.`;
const notReadyForManager = (missing: string) =>
  `Gari hili bado halina ${missing}. Kamilisha kwenye Magari (⋯ → Badilisha taarifa) kisha uombe mafuta.`;

// A fuel request may leave the reason empty; it then just says "Mafuta".
const readKind = (formData: FormData) => (formData.get("kind") === "fuel" ? "fuel" : "other");
const reasonFor = (kind: string, reason: string) => (kind === "fuel" && !reason.trim() ? "Mafuta" : reason);

// Fuel is asked for as a price per litre (it differs between stations) and a number of litres; the
// amount is worked out here from the two, never taken from the form. Other requests give an amount.
type FuelOrder = ReturnType<typeof parseFuelOrder>;
const readFuelOrder = (kind: string, values: FormValues): FuelOrder | null =>
  kind === "fuel" ? parseFuelOrder(values.fuelPrice ?? "", values.litres ?? "") : null;
// A fuel order with mistakes reports them itself, so its amount stands in as valid meanwhile.
const amountFor = (values: FormValues, order: FuelOrder | null) =>
  order ? ("amount" in order ? String(order.amount) : "1") : values.amount;
const orderErrors = (order: FuelOrder | null) => (order && "errors" in order ? order.errors : {});

// A request like one already there (see duplicate-rules.ts) comes back with that match to confirm.
// Sent again with the match's id, it goes through and keeps pointing at it for the reviewers.
async function duplicateToConfirm(
  formData: FormData,
  r: Parameters<typeof findRequestDuplicate>[0],
): Promise<{ confirm: DuplicateMatch } | { duplicateOf: number | null }> {
  const match = await findRequestDuplicate(r);
  if (match && match.id !== parseDuplicateOk(formData.get("duplicateOk"))) return { confirm: match };
  return { duplicateOf: match?.id ?? null };
}

export async function createRequest(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const driver = await requireUser("driver");
  const kind = readKind(formData);
  const values: FormValues = {
    kind,
    amount: String(formData.get("amount") ?? ""),
    fuelPrice: String(formData.get("fuelPrice") ?? ""),
    litres: String(formData.get("litres") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    odometer: String(formData.get("odometer") ?? ""),
    gauge: String(formData.get("gauge") ?? ""),
  };
  const order = readFuelOrder(kind, values);
  const parsed = parseMoneyRequest({ amount: amountFor(values, order), reason: reasonFor(kind, values.reason) });
  const reading = kind === "fuel" ? parseReading({ odometer: values.odometer!, gauge: values.gauge! }) : null;
  if (!parsed.ok || (reading && !reading.ok) || (order && "errors" in order)) {
    return {
      ok: false,
      errors: { ...(parsed.ok ? {} : parsed.errors), ...(reading && !reading.ok ? reading.errors : {}), ...orderErrors(order) },
      values,
    };
  }

  const [ownCar] = await query<{ id: number }>("SELECT id FROM cars WHERE driver_id = $1", [driver.id]);
  const check = await duplicateToConfirm(formData, {
    carId: ownCar?.id ?? null,
    requesterId: driver.id,
    kind,
    amount: Number(parsed.amount),
    litres: order && "litres" in order ? order.litres : null,
    date: null,
  });
  if ("confirm" in check) return { ok: false, errors: {}, values, duplicate: check.confirm };

  if (!reading || !order) {
    await query(
      `INSERT INTO money_requests (requester_id, car_id, amount, reason, duplicate_of)
       VALUES ($1, (SELECT id FROM cars WHERE driver_id = $1), $2, $3, $4)`,
      [driver.id, parsed.amount, parsed.reason, check.duplicateOf],
    );
  } else {
    // The reading and the request go in together. Locking the car keeps a double tap from making two.
    const error = await transaction(async (client): Promise<FormErrors | null> => {
      const car = await client.query<{ id: number; fuel_type: string | null; tank_litres: number | null }>(
        "SELECT id, fuel_type, tank_litres FROM cars WHERE driver_id = $1 FOR UPDATE",
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
      // Fuel is measured from the manager's starting reading, in litres of this car's tank.
      const missing = missingForFuel({ fuelType: carRow.fuel_type, tank: carRow.tank_litres, measured: !!last.rows[0] });
      if (missing || !last.rows[0]) return { kind: notReadyForDriver(missing) };
      const odometerError = checkOdometer(reading.odometer, last.rows[0].odometer_km, true);
      if (odometerError) return { odometer: odometerError };
      const inserted = await client.query<{ id: number }>(
        `INSERT INTO money_requests (requester_id, car_id, amount, reason, kind, fuel_price, duplicate_of)
         VALUES ($1, $2, $3, $4, 'fuel', $5, $6)
         RETURNING id`,
        [driver.id, carRow.id, parsed.amount, parsed.reason, order.price, check.duplicateOf],
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
  revalidatePath("/factory", "layout");
  revalidatePath("/director", "layout");
  await notify([MANAGERS_CHANNEL]);
  return { ok: true };
}

// A vehicle manager's own request is approved as it's made and goes to the factory manager, then the
// mhasibu. With a past date it is history instead: entered as already paid on that day, with no
// factory manager, mhasibu or receipt step.
export async function createManagerRequest(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const manager = await requireUser("manager");
  const kind = readKind(formData);
  const values: FormValues = {
    kind,
    amount: String(formData.get("amount") ?? ""),
    fuelPrice: String(formData.get("fuelPrice") ?? ""),
    litres: String(formData.get("litres") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    carId: String(formData.get("carId") ?? ""),
    date: String(formData.get("date") ?? ""),
  };
  // Past fuel too: the price paid that day and the litres give its amount.
  const order = readFuelOrder(kind, values);
  const parsed = parseMoneyRequest({ amount: amountFor(values, order), reason: reasonFor(kind, values.reason) });
  let car = parseCarChoice(values.carId!);
  if (kind === "fuel" && !("error" in car) && car.carId === null) car = { error: "Mafuta ni ya gari: chagua gari." };
  const date = parseEntryDate(values.date!, todayInTanzania());
  if (!parsed.ok || "error" in car || "error" in date || (order && "errors" in order)) {
    return {
      ok: false,
      errors: {
        ...(parsed.ok ? {} : parsed.errors),
        ...("error" in car ? { carId: car.error } : {}),
        ...("error" in date ? { date: date.error } : {}),
        ...orderErrors(order),
      },
      values,
    };
  }

  // Fuel bought now needs the car's fuel type, tank and starting reading to be measured against.
  // Past fuel is history from before tracking, so it doesn't.
  if (kind === "fuel" && date.date === null && car.carId !== null) {
    const [row] = await query<{ fuel_type: string | null; tank_litres: number | null; measured: boolean }>(
      `SELECT fuel_type, tank_litres, EXISTS (SELECT 1 FROM fuel_readings WHERE car_id = cars.id) AS measured
         FROM cars WHERE id = $1`,
      [car.carId],
    );
    const missing = row ? missingForFuel({ fuelType: row.fuel_type, tank: row.tank_litres, measured: row.measured }) : "";
    if (missing) return { ok: false, errors: { carId: notReadyForManager(missing) }, values };
  }

  const check = await duplicateToConfirm(formData, {
    carId: car.carId,
    requesterId: manager.id,
    kind,
    amount: Number(parsed.amount),
    litres: order && "litres" in order ? order.litres : null,
    date: date.date,
  });
  if ("confirm" in check) return { ok: false, errors: {}, values, duplicate: check.confirm };

  // A manager's fuel has no reading: the driver's next one measures it. History is dated midday that day.
  const inserted = await query(
    `WITH at AS (SELECT CASE WHEN $6::date IS NULL THEN now() ELSE ($6::date + time '12:00') AT TIME ZONE $7 END AS t)
     INSERT INTO money_requests (requester_id, car_id, amount, reason, status, reviewed_by, reviewed_at, kind, fuel_price,
                                 created_at, factory_reviewed_at, issued_at, backfilled_at, duplicate_of)
     SELECT $1, $2::int, $3, $4, 'approved', $1, at.t, $5,
            CASE WHEN $5 = 'fuel' THEN $8::int END,
            at.t,
            CASE WHEN $6::date IS NULL THEN NULL ELSE at.t END,
            CASE WHEN $6::date IS NULL THEN NULL ELSE at.t END,
            CASE WHEN $6::date IS NULL THEN NULL ELSE now() END,
            $9::int
       FROM at
      WHERE $2::int IS NULL OR EXISTS (SELECT 1 FROM cars WHERE id = $2::int)
     RETURNING id`,
    [
      manager.id,
      car.carId,
      parsed.amount,
      parsed.reason,
      kind,
      date.date,
      TIME_ZONE,
      order && "price" in order ? order.price : null,
      check.duplicateOf,
    ],
  );
  if (inserted.length === 0) {
    return { ok: false, errors: { carId: "Gari hilo halipo tena. Chagua jingine." }, values };
  }
  revalidatePath("/manager", "layout");
  revalidatePath("/factory", "layout");
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
  revalidatePath("/factory", "layout");
  revalidatePath("/driver");
  // Tell the driver, and other managers looking at the same list.
  if (updated[0]) await notify([driverChannel(updated[0].requester_id), MANAGERS_CHANNEL]);
}

// The factory manager authorises what the vehicle manager approved, sending it on to the mhasibu,
// or declines it. Only approved requests not yet decided here match, so a double tap or a second
// factory manager is a no-op.
export async function authoriseRequest(formData: FormData) {
  const factoryManager = await requireUser("factory_manager");
  const id = Number(formData.get("id"));
  const decision = formData.get("decision");
  if (!Number.isInteger(id) || (decision !== "authorised" && decision !== "rejected")) return;

  const updated = await query<{ requester_id: number }>(
    `UPDATE money_requests
        SET factory_reviewed_at = now(), factory_reviewed_by = $3,
            status = CASE WHEN $2 = 'rejected' THEN 'rejected' ELSE status END
      WHERE id = $1 AND status = 'approved' AND factory_reviewed_at IS NULL
      RETURNING requester_id`,
    [id, decision, factoryManager.id],
  );
  revalidatePath("/factory", "layout");
  revalidatePath("/manager", "layout");
  revalidatePath("/accountant", "layout");
  revalidatePath("/director", "layout");
  revalidatePath("/driver");
  if (updated[0]) await notify([driverChannel(updated[0].requester_id), MANAGERS_CHANNEL]);
}

// The mhasibu pays out an authorised request, with an optional note such as an M-Pesa reference.
// Only unpaid authorised requests match, so a double tap or a second mhasibu is a no-op.
// The payment then waits for its receipt, and gets its payment voucher (hati ya malipo) numbered
// for the year: a lock held until the end of the transaction keeps two payments from one number.
export async function issueRequest(formData: FormData) {
  const accountant = await requireUser("accountant");
  const id = Number(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim().slice(0, MAX_ISSUE_NOTE_LENGTH) || null;
  if (!Number.isInteger(id)) return;

  const issued = await transaction(async (client) => {
    const paid = await client.query<{ requester_id: number }>(
      `UPDATE money_requests SET issued_at = now(), issued_by = $2, issue_note = $3, receipt_due = true
        WHERE id = $1 AND status = 'approved' AND factory_reviewed_at IS NOT NULL AND issued_at IS NULL
        RETURNING requester_id`,
      [id, accountant.id, note],
    );
    if (paid.rows.length === 0) return [];
    await client.query("SELECT pg_advisory_xact_lock(hashtext('payment_vouchers'))");
    await client.query(
      `WITH next AS (SELECT y AS year, coalesce((SELECT max(seq) FROM payment_vouchers WHERE year = y), 0) + 1 AS seq
                       FROM (SELECT extract(year FROM now() AT TIME ZONE $2)::int AS y) t)
       INSERT INTO payment_vouchers (request_id, year, seq, number)
       SELECT $1, year, seq, 'HM-' || year || '-' || lpad(seq::text, greatest(3, length(seq::text)), '0') FROM next`,
      [id, TIME_ZONE],
    );
    return paid.rows;
  });
  revalidatePath("/accountant", "layout");
  revalidatePath("/manager", "layout");
  revalidatePath("/factory", "layout");
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
  revalidatePath("/factory", "layout");
  revalidatePath("/director", "layout");
  revalidatePath("/driver", "layout");
  await notify([driverChannel(added[0].requester_id), MANAGERS_CHANNEL]);
  return { ok: true, message: "Risiti imewekwa." };
}
