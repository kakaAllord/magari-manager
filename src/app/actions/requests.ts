"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, transaction } from "@/lib/db";
import { parseDuplicateOk, type DuplicateMatch } from "@/lib/duplicate-rules";
import { findRequestDuplicate } from "@/lib/duplicates";
import { missingForFuel } from "@/lib/fuel-ready";
import { driverChannel, MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { TIME_ZONE } from "@/lib/time";
import type { PoolClient } from "pg";
import {
  checkOdometer,
  checkReceiptImage,
  MAX_ISSUE_NOTE_LENGTH,
  parseCarChoice,
  parseDepartment,
  parseEntryDate,
  parseExpenseItems,
  parseFuelOrder,
  parseMoneyRequest,
  parsePayment,
  parseReading,
  type ExpenseItem,
  type ExpenseItemErrors,
  type ExpenseItemInput,
  type PaymentErrors,
  type ReadingErrors,
  type RequestErrors,
} from "@/lib/validation";
import { PAYMENT_METHODS } from "@/lib/voucher-fields";

type FormErrors = RequestErrors &
  ReadingErrors & {
    carId?: string;
    kind?: string;
    date?: string;
    fuelPrice?: string;
    litres?: string;
    items?: Record<number, ExpenseItemErrors>;
    itemsMessage?: string;
    paymentMethod?: string;
  };
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
  department?: string;
  items?: ExpenseItemInput[];
  paymentMethod?: string;
  reference?: string;
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

// The breakdown lines as sent: one value per line in each column. A page from before 026 sends none.
const readItems = (formData: FormData): ExpenseItemInput[] => {
  const descriptions = formData.getAll("itemDescription").map(String);
  const quantities = formData.getAll("itemQuantity").map(String);
  const prices = formData.getAll("itemUnitPrice").map(String);
  return descriptions.map((description, i) => ({ description, quantity: quantities[i] ?? "", unitPrice: prices[i] ?? "" }));
};

// A breakdown, when given, sets the amount: the sum of its lines. Fuel never has one.
type Items = ReturnType<typeof parseExpenseItems>;
const readBreakdown = (kind: string, values: FormValues): Items =>
  kind === "fuel" ? { ok: true, items: [], total: 0 } : parseExpenseItems(values.items ?? []);
const breakdownErrors = (items: Items): Partial<FormErrors> =>
  items.ok ? {} : { ...(Object.keys(items.errors).length ? { items: items.errors } : {}), ...(items.message ? { itemsMessage: items.message } : {}) };
const amountWithItems = (amount: string, items: Items) => (items.ok && items.items.length ? String(items.total) : amount);

async function saveItems(client: PoolClient, requestId: number, items: ExpenseItem[]) {
  await client.query("DELETE FROM money_request_items WHERE request_id = $1", [requestId]);
  for (const [i, item] of items.entries()) {
    await client.query(
      `INSERT INTO money_request_items (request_id, position, description, quantity, unit_price, amount)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [requestId, i + 1, item.description, item.quantity, item.unitPrice, item.amount],
    );
  }
}

// The payment's voucher (hati ya malipo), numbered PV-YYYY-NNN for the year it was paid (vouchers
// numbered HM- before 026 were renamed PV- in 027, keeping their digits). A lock held until the
// end of the transaction keeps two payments from one number; a payment that has one keeps it.
async function giveVoucher(client: PoolClient, requestId: number) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('payment_vouchers'))");
  await client.query(
    `WITH y AS (SELECT extract(year FROM issued_at AT TIME ZONE $2)::int AS year FROM money_requests WHERE id = $1 AND issued_at IS NOT NULL),
          next AS (SELECT year, coalesce((SELECT max(seq) FROM payment_vouchers WHERE payment_vouchers.year = y.year), 0) + 1 AS seq FROM y)
     INSERT INTO payment_vouchers (request_id, year, seq, number)
     SELECT $1, year, seq, 'PV-' || year || '-' || lpad(seq::text, greatest(3, length(seq::text)), '0') FROM next
     ON CONFLICT (request_id) DO NOTHING`,
    [requestId, TIME_ZONE],
  );
}

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
    items: readItems(formData),
  };
  const order = readFuelOrder(kind, values);
  const items = readBreakdown(kind, values);
  const parsed = parseMoneyRequest({ amount: amountWithItems(amountFor(values, order), items), reason: reasonFor(kind, values.reason) });
  const reading = kind === "fuel" ? parseReading({ odometer: values.odometer!, gauge: values.gauge! }) : null;
  if (!parsed.ok || (reading && !reading.ok) || (order && "errors" in order) || !items.ok) {
    return {
      ok: false,
      errors: {
        ...(parsed.ok ? {} : parsed.errors),
        ...(reading && !reading.ok ? reading.errors : {}),
        ...orderErrors(order),
        ...breakdownErrors(items),
      },
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

  // A driver's request is always for Usafirishaji, the department the drivers are in.
  if (!reading || !order) {
    await transaction(async (client) => {
      const inserted = await client.query<{ id: number }>(
        `INSERT INTO money_requests (requester_id, car_id, amount, reason, duplicate_of, department)
         VALUES ($1, (SELECT id FROM cars WHERE driver_id = $1), $2, $3, $4, 'usafirishaji') RETURNING id`,
        [driver.id, parsed.amount, parsed.reason, check.duplicateOf],
      );
      if (items.ok && items.items.length) await saveItems(client, inserted.rows[0].id, items.items);
    });
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
    department: String(formData.get("department") ?? ""),
    items: readItems(formData),
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
    reference: String(formData.get("reference") ?? ""),
  };
  // Past fuel too: the price paid that day and the litres give its amount.
  const order = readFuelOrder(kind, values);
  const items = readBreakdown(kind, values);
  const parsed = parseMoneyRequest({ amount: amountWithItems(amountFor(values, order), items), reason: reasonFor(kind, values.reason) });
  let car = parseCarChoice(values.carId!);
  if (kind === "fuel" && !("error" in car) && car.carId === null) car = { error: "Mafuta ni ya gari: chagua gari." };
  const date = parseEntryDate(values.date!, todayInTanzania());
  // History was paid already: how, for its voucher. A page from before 026 doesn't ask.
  const method = PAYMENT_METHODS.find((m) => m.key === values.paymentMethod)?.key ?? null;
  const methodMissing = !("error" in date) && date.date !== null && formData.has("paymentMethod") && !method;
  const reference = values.reference!.trim().slice(0, MAX_ISSUE_NOTE_LENGTH) || null;
  if (!parsed.ok || "error" in car || "error" in date || (order && "errors" in order) || !items.ok || methodMissing) {
    return {
      ok: false,
      errors: {
        ...(parsed.ok ? {} : parsed.errors),
        ...("error" in car ? { carId: car.error } : {}),
        ...("error" in date ? { date: date.error } : {}),
        ...orderErrors(order),
        ...breakdownErrors(items),
        ...(methodMissing ? { paymentMethod: "Chagua jinsi yalivyolipwa." } : {}),
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

  // A manager's fuel has no reading: the driver's next one measures it. History is dated midday that day,
  // and gets its voucher as it's typed in, since it was paid already.
  const inserted = await transaction(async (client) => {
    const row = await client.query<{ id: number }>(
    `WITH at AS (SELECT CASE WHEN $6::date IS NULL THEN now() ELSE ($6::date + time '12:00') AT TIME ZONE $7 END AS t)
     INSERT INTO money_requests (requester_id, car_id, amount, reason, status, reviewed_by, reviewed_at, kind, fuel_price,
                                 created_at, factory_reviewed_at, issued_at, backfilled_at, duplicate_of, department,
                                 payment_method, issue_note)
     SELECT $1, $2::int, $3, $4, 'approved', $1, at.t, $5,
            CASE WHEN $5 = 'fuel' THEN $8::int END,
            at.t,
            CASE WHEN $6::date IS NULL THEN NULL ELSE at.t END,
            CASE WHEN $6::date IS NULL THEN NULL ELSE at.t END,
            CASE WHEN $6::date IS NULL THEN NULL ELSE now() END,
            $9::int, $10,
            CASE WHEN $6::date IS NULL THEN NULL ELSE $11 END,
            CASE WHEN $6::date IS NULL THEN NULL ELSE $12 END
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
      parseDepartment(values.department!),
      method,
      reference,
    ],
    );
    const id = row.rows[0]?.id;
    if (id === undefined) return [];
    if (items.ok && items.items.length) await saveItems(client, id, items.items);
    if (date.date !== null) await giveVoucher(client, id);
    return [id];
  });
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

export type PayState = { ok: false; errors: PaymentErrors & { form?: string } } | undefined;

// The mhasibu pays out an authorised request: how it was paid, the reference (an M-Pesa or bank
// number; needed for anything but cash) and which supporting documents came with it, all printed on
// its voucher. Only unpaid authorised requests match, so a double tap or a second mhasibu is a no-op.
// The payment then waits for its receipt, and gets its payment voucher. The paid row leaves the
// list, so the confirmation (with the voucher's link) is shown by the page from ?paid=.
export async function payRequest(_prev: PayState, formData: FormData): Promise<PayState> {
  const accountant = await requireUser("accountant");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { ok: false, errors: { form: "Ombi hilo halipo." } };
  const payment = parsePayment({
    method: String(formData.get("method") ?? ""),
    reference: String(formData.get("reference") ?? ""),
    documents: formData.getAll("documents").map(String),
    other: String(formData.get("documentsOther") ?? ""),
  });
  if (!payment.ok) return { ok: false, errors: payment.errors };
  const paid = await pay(accountant.id, id, payment);
  if (!paid) return { ok: false, errors: { form: "Ombi hili limeshalipwa, au halijaidhinishwa." } };
  redirect(`/accountant?paid=${id}`);
}

// The old Lipa button, for a page opened before 026: a free-text note and no method.
export async function issueRequest(formData: FormData) {
  const accountant = await requireUser("accountant");
  const id = Number(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim().slice(0, MAX_ISSUE_NOTE_LENGTH) || null;
  if (!Number.isInteger(id)) return;
  await pay(accountant.id, id, { method: null, reference: note, documents: [], other: null });
}

// Pays and numbers the voucher in one transaction; returns the voucher number, or null if nothing was paid.
async function pay(
  accountantId: number,
  id: number,
  p: { method: string | null; reference: string | null; documents: string[]; other: string | null },
) {
  const issued = await transaction(async (client) => {
    const paid = await client.query<{ requester_id: number }>(
      `UPDATE money_requests SET issued_at = now(), issued_by = $2, issue_note = $3, receipt_due = true,
              payment_method = $4, supporting_documents = $5, supporting_other = $6
        WHERE id = $1 AND status = 'approved' AND factory_reviewed_at IS NOT NULL AND issued_at IS NULL
        RETURNING requester_id`,
      [id, accountantId, p.reference, p.method, p.documents, p.other],
    );
    if (paid.rows.length === 0) return null;
    await giveVoucher(client, id);
    const voucher = await client.query<{ number: string }>("SELECT number FROM payment_vouchers WHERE request_id = $1", [id]);
    return { requesterId: paid.rows[0].requester_id, number: voucher.rows[0].number };
  });
  revalidatePath("/accountant", "layout");
  revalidatePath("/manager", "layout");
  revalidatePath("/factory", "layout");
  revalidatePath("/director", "layout");
  revalidatePath("/driver", "layout");
  if (issued) await notify([driverChannel(issued.requesterId), MANAGERS_CHANNEL]);
  return issued?.number ?? null;
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

export type EditRequestState =
  | { ok: true; message: string }
  | {
      ok: false;
      errors: RequestErrors & {
        fuelPrice?: string;
        litres?: string;
        date?: string;
        form?: string;
        items?: Record<number, ExpenseItemErrors>;
        itemsMessage?: string;
      };
    }
  | undefined;

// A meneja corrects a request until the mhasibu pays it: its amount (or, for fuel, price and litres)
// and reason. Typed-in history, which never goes through the mhasibu, stays correctable, with its day.
// If the factory manager had already authorised it, a new amount sends it back to them: they
// authorised a different sum. Rejected and paid requests are left alone.
export async function updateRequest(_prev: EditRequestState, formData: FormData): Promise<EditRequestState> {
  const manager = await requireUser("manager");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { ok: false, errors: { form: "Ombi hilo halipo." } };
  const reason = String(formData.get("reason") ?? "");
  const date = parseEntryDate(String(formData.get("date") ?? ""), todayInTanzania());

  let requesterId: number | null = null;
  const result = await transaction(async (client): Promise<EditRequestState> => {
    const found = await client.query<{
      requester_id: number; kind: string; fuel_price: number | null; amount: string; status: string;
      issued_at: Date | null; backfilled_at: Date | null; factory_reviewed_at: Date | null;
    }>(
      `SELECT requester_id, kind, fuel_price, amount, status, issued_at, backfilled_at, factory_reviewed_at
         FROM money_requests WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const r = found.rows[0];
    if (!r) return { ok: false, errors: { form: "Ombi hilo halipo." } };
    requesterId = r.requester_id;
    const history = r.backfilled_at !== null;
    if (!history && (r.issued_at !== null || (r.status !== "pending" && r.status !== "approved"))) {
      return { ok: false, errors: { form: "Ombi hili limeshalipwa au limekataliwa, haliwezi kubadilishwa tena." } };
    }
    // Fuel keeps its price per litre; requests saved before that was kept take a plain amount.
    const order = r.kind === "fuel" && r.fuel_price !== null
      ? parseFuelOrder(String(formData.get("fuelPrice") ?? ""), String(formData.get("litres") ?? ""))
      : null;
    // The breakdown editor sends its lines (none left means no breakdown); a dialog from before 026 sends none.
    const editor = r.kind !== "fuel" && formData.has("itemDescription");
    const items: Items = editor ? parseExpenseItems(readItems(formData)) : { ok: true, items: [], total: 0 };
    const parsed = parseMoneyRequest({
      amount: order ? ("amount" in order ? String(order.amount) : "1") : amountWithItems(String(formData.get("amount") ?? ""), items),
      reason: r.kind === "fuel" ? reasonFor("fuel", reason) : reason,
    });
    if (!parsed.ok || (order && "errors" in order) || "error" in date || (history && date.date === null) || !items.ok) {
      return {
        ok: false,
        errors: {
          ...(parsed.ok ? {} : parsed.errors),
          ...orderErrors(order),
          ...breakdownErrors(items),
          ...("error" in date ? { date: date.error } : history && date.date === null ? { date: "Rekodi ya zamani lazima iwe na tarehe ya zamani." } : {}),
        },
      };
    }
    // Authorised on another sum: back to the factory manager.
    const resend = !history && r.factory_reviewed_at !== null && Number(parsed.amount) !== Number(r.amount);
    await client.query(
      `UPDATE money_requests
          SET amount = $2, reason = $3, fuel_price = $4,
              factory_reviewed_at = CASE WHEN $5 THEN NULL ELSE factory_reviewed_at END,
              factory_reviewed_by = CASE WHEN $5 THEN NULL ELSE factory_reviewed_by END,
              edited_at = now(), edited_by = $6
        WHERE id = $1`,
      [id, parsed.amount, parsed.reason, order && "price" in order ? order.price : r.fuel_price, resend, manager.id],
    );
    // A breakdown that no longer adds up to the amount would print wrong on the voucher.
    if (editor && items.ok) await saveItems(client, id, items.items);
    else if (Number(parsed.amount) !== Number(r.amount)) await saveItems(client, id, []);
    // History moves as a whole: every step happened on the same day.
    if (history && date.date) {
      await client.query(
        `WITH at AS (SELECT ($2::date + time '12:00') AT TIME ZONE $3 AS t)
         UPDATE money_requests SET created_at = at.t, reviewed_at = at.t, factory_reviewed_at = at.t, issued_at = at.t
           FROM at WHERE id = $1`,
        [id, date.date, TIME_ZONE],
      );
    }
    return {
      ok: true,
      message: resend ? "Ombi limebadilishwa na limerudi kwa meneja wa kiwanda kuidhinishwa tena." : "Ombi limebadilishwa.",
    };
  });
  if (result?.ok && requesterId !== null) {
    revalidatePath("/manager", "layout");
    revalidatePath("/factory", "layout");
    revalidatePath("/accountant", "layout");
    revalidatePath("/director", "layout");
    revalidatePath("/driver", "layout");
    await notify([driverChannel(requesterId), MANAGERS_CHANNEL]);
  }
  return result;
}
