"use server";

import { revalidatePath } from "next/cache";
import { query, transaction } from "@/lib/db";
import { parseDuplicateOk, type DuplicateMatch } from "@/lib/duplicate-rules";
import { findIncomeDuplicate } from "@/lib/duplicates";
import { formatMoney } from "@/lib/format";
import { DELETE_WINDOW_HOURS } from "@/lib/incomes";
import { MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { TIME_ZONE } from "@/lib/time";
import {
  MAX_ISSUE_NOTE_LENGTH,
  cargoUnit,
  parseCargo,
  parseDebtPayment,
  parseEntryDate,
  parseIncome,
  parsePartPayment,
  type IncomeErrors,
  type IncomeInput,
} from "@/lib/validation";

type CargoErrors = { rate?: string; quantity?: string; destination?: string };
type PaymentErrors = { paid?: string; customer?: string };
type IncomeValues = IncomeInput & {
  kind: string;
  unit: string;
  rate: string;
  quantity: string;
  destination: string;
  date: string;
  payment: string;
  paid: string;
  customer: string;
};

export type IncomeFormState =
  | { ok: true; message: string }
  | {
      ok: false;
      errors: IncomeErrors & CargoErrors & PaymentErrors & { date?: string };
      values: IncomeValues;
      duplicate?: DuplicateMatch;
    }
  | undefined;

export async function createIncome(_prev: IncomeFormState, formData: FormData): Promise<IncomeFormState> {
  const manager = await requireUser("manager");
  // A page opened before cargo existed sends no kind, so it keeps recording a plain amount.
  const values: IncomeValues = {
    kind: formData.get("kind") === "cargo" ? "cargo" : "other",
    carId: String(formData.get("carId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    // A page opened before kilos were offered sends tonnes under their old name and no unit.
    unit: cargoUnit(String(formData.get("unit") ?? "")),
    rate: String(formData.get("rate") ?? ""),
    quantity: String(formData.get("quantity") ?? formData.get("tonnes") ?? ""),
    destination: String(formData.get("destination") ?? ""),
    description: String(formData.get("description") ?? ""),
    date: String(formData.get("date") ?? ""),
    // Paid in full unless the manager chose "Amelipa sehemu"; a page opened before this sends nothing.
    payment: formData.get("payment") === "part" ? "part" : "full",
    paid: String(formData.get("paid") ?? ""),
    customer: String(formData.get("customer") ?? ""),
  };
  // Cargo is typed as a price and a quantity, by the tonne or the kilo; its amount is worked out here,
  // never taken from the form. A cargo entry with mistakes reports them itself, so "1" stands in meanwhile.
  const cargo = values.kind === "cargo" ? parseCargo(values.rate, values.quantity, cargoUnit(values.unit), values.destination) : null;
  const amount = cargo ? ("amount" in cargo ? String(cargo.amount) : "1") : values.amount;
  const parsed = parseIncome({ ...values, amount });
  const date = parseEntryDate(values.date, todayInTanzania());
  // Part paid: the client and what they paid now, checked against the total once that is known
  // (not while cargo's "1" stands in for it).
  const total = parsed.ok && !(cargo && "errors" in cargo) ? Number(parsed.amount) : Infinity;
  const part = values.payment === "part" ? parsePartPayment(values.paid, values.customer, total) : null;
  if (!parsed.ok || "error" in date || (cargo && "errors" in cargo) || (part && "errors" in part)) {
    return {
      ok: false,
      errors: {
        ...(parsed.ok ? {} : parsed.errors),
        ...(cargo && "errors" in cargo ? cargo.errors : {}),
        ...(part && "errors" in part ? part.errors : {}),
        ...("error" in date ? { date: date.error } : {}),
      },
      values,
    };
  }
  const load = cargo && "amount" in cargo ? cargo : null;
  const credit = part && "paid" in part ? part : null;

  // Income like one already there for this car warns first. Sent again with that match's id, it is
  // saved and marked, so it still shows as a possible repeat.
  const duplicate = await findIncomeDuplicate({ carId: parsed.carId, amount: Number(parsed.amount), date: date.date });
  if (duplicate && duplicate.id !== parseDuplicateOk(formData.get("duplicateOk"))) {
    return { ok: false, errors: {}, values, duplicate };
  }

  // `source` keeps the plate as it is now, so lists and the feed read the same as older entries.
  // A past date is history: it's dated midday that day, and backfilled_at says when it was typed in.
  // Income on credit keeps what was paid now as its first payment, dated with the entry.
  const inserted = await transaction(async (client) => {
    const { rows } = await client.query<{ id: number; source: string; created_at: Date }>(
      `INSERT INTO incomes (car_id, source, amount, description, recorded_by, created_at, backfilled_at,
                            rate_per_tonne, tonnes, unit, destination, duplicate_of, amount_paid, customer_name)
       SELECT id, plate, $2, $3, $4,
              CASE WHEN $5::date IS NULL THEN now() ELSE ($5::date + time '12:00') AT TIME ZONE $6 END,
              CASE WHEN $5::date IS NULL THEN NULL ELSE now() END,
              $7, $8, $13, $9, $10, coalesce($11::numeric, $2::numeric), $12
         FROM cars WHERE id = $1
       RETURNING id, source, created_at`,
      [
        parsed.carId, parsed.amount, parsed.description, manager.id, date.date, TIME_ZONE, load?.ratePerTonne ?? null,
        load?.tonnes ?? null, load?.destination ?? null, duplicate?.id ?? null, credit?.paid ?? null, credit?.customer ?? null,
        load?.unit ?? "tonne",
      ],
    );
    if (rows.length > 0 && credit && credit.paid > 0) {
      await client.query(
        "INSERT INTO income_payments (income_id, amount, paid_at, recorded_by) VALUES ($1, $2, $3, $4)",
        [rows[0].id, credit.paid, rows[0].created_at, manager.id],
      );
    }
    return rows;
  });
  if (inserted.length === 0) {
    return { ok: false, errors: { carId: "Gari hilo halipo tena. Chagua jingine." }, values };
  }
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  // Directors and other managers listen on the managers' channel.
  await notify([MANAGERS_CHANNEL]);
  const owed = credit ? ` ${credit.customer} anadaiwa ${formatMoney(Number(parsed.amount) - credit.paid)}.` : "";
  return {
    ok: true,
    message:
      (date.date
        ? `Mapato ya zamani ya gari ${inserted[0].source} yamehifadhiwa.`
        : `Mapato ya gari ${inserted[0].source} yamehifadhiwa.`) + owed,
  };
}

export type DebtPaymentState = { ok: true; message: string } | { ok: false; error: string } | undefined;

// A client pays some or all of what they still owe on an entry. Any manager may take it. The row is
// locked while it's checked, so two payments at once can't take it past its total.
export async function recordDebtPayment(_prev: DebtPaymentState, formData: FormData): Promise<DebtPaymentState> {
  const manager = await requireUser("manager");
  const incomeId = Number(formData.get("incomeId"));
  if (!Number.isInteger(incomeId)) return { ok: false, error: "Mapato hayajulikani." };
  const note = String(formData.get("note") ?? "").trim().slice(0, MAX_ISSUE_NOTE_LENGTH) || null;

  const result = await transaction(async (client) => {
    const { rows } = await client.query<{ owed: string; customer_name: string | null; invoice_id: number | null }>(
      "SELECT amount - amount_paid AS owed, customer_name, invoice_id FROM incomes WHERE id = $1 AND deleted_at IS NULL FOR UPDATE",
      [incomeId],
    );
    const owed = Number(rows[0]?.owed ?? 0);
    if (owed <= 0) return { ok: false as const, error: "Deni hili limeshalipwa au mapato yamefutwa." };
    const amount = parseDebtPayment(String(formData.get("amount") ?? ""), owed);
    if ("error" in amount) return { ok: false as const, error: amount.error };
    await client.query("UPDATE incomes SET amount_paid = amount_paid + $2 WHERE id = $1", [incomeId, amount.amount]);
    await client.query("INSERT INTO income_payments (income_id, amount, note, recorded_by) VALUES ($1, $2, $3, $4)", [
      incomeId,
      amount.amount,
      note,
      manager.id,
    ]);
    // The last trip of an invoice paid off marks the invoice paid too.
    const invoice = await client.query<{ number: string }>(
      `UPDATE invoices SET paid_at = now(), paid_by = $2
        WHERE id = $1 AND paid_at IS NULL AND cancelled_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM incomes WHERE invoice_id = $1 AND deleted_at IS NULL AND amount_paid < amount)
        RETURNING number`,
      [rows[0].invoice_id, manager.id],
    );
    const left = owed - amount.amount;
    const who = rows[0].customer_name ?? "Mteja";
    const settled = invoice.rows[0] ? ` Ankara ${invoice.rows[0].number} imelipwa yote.` : "";
    return {
      ok: true as const,
      message:
        left === 0
          ? `${who} amemaliza deni lake.${settled}`
          : `Malipo ya ${formatMoney(amount.amount)} yamehifadhiwa. ${who} bado anadaiwa ${formatMoney(left)}.`,
    };
  });
  if (result.ok) {
    revalidatePath("/manager", "layout");
    revalidatePath("/director", "layout");
    revalidatePath("/factory", "layout");
    await notify([MANAGERS_CHANNEL]);
  }
  return result;
}

export type DeleteIncomeState = { ok: false; message: string } | undefined;

// Only the manager who recorded an entry may delete it, and only within the window after it was
// typed in (for history, after it was entered, not its date). The row is kept and marked deleted.
// Trips from an invoice go only by cancelling the invoice, so the two never disagree.
export async function deleteIncome(_prev: DeleteIncomeState, formData: FormData): Promise<DeleteIncomeState> {
  const manager = await requireUser("manager");
  const incomeId = Number(formData.get("incomeId"));
  if (!Number.isInteger(incomeId)) return { ok: false, message: "Mapato hayajulikani." };

  const deleted = await query(
    `UPDATE incomes SET deleted_at = now(), deleted_by = $2
      WHERE id = $1 AND recorded_by = $2 AND deleted_at IS NULL AND invoice_id IS NULL
        AND coalesce(backfilled_at, created_at) > now() - make_interval(hours => $3)
      RETURNING id`,
    [incomeId, manager.id, DELETE_WINDOW_HOURS],
  );
  if (deleted.length === 0) {
    return { ok: false, message: `Hayawezi kufutwa tena: zimepita saa ${DELETE_WINDOW_HOURS} au yamefutwa tayari.` };
  }
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  await notify([MANAGERS_CHANNEL]);
}
