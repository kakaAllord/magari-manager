"use server";

import { getT } from "@/lib/lang";
import { revalidatePath } from "next/cache";
import { query, transaction } from "@/lib/db";
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
  type IncomeErrors,
} from "@/lib/validation";

type CargoErrors = { rate?: string; quantity?: string; destination?: string };

export type DebtPaymentState = { ok: true; message: string } | { ok: false; error: string } | undefined;

// A client pays some or all of what they still owe on an entry. Any manager may take it. The row is
// locked while it's checked, so two payments at once can't take it past its total.
export async function recordDebtPayment(_prev: DebtPaymentState, formData: FormData): Promise<DebtPaymentState> {
  const manager = await requireUser("manager");
  const t = await getT();
  const incomeId = Number(formData.get("incomeId"));
  if (!Number.isInteger(incomeId)) return { ok: false, error: t("Mapato hayajulikani.", "Unknown income.") };
  const note = String(formData.get("note") ?? "").trim().slice(0, MAX_ISSUE_NOTE_LENGTH) || null;

  const result = await transaction(async (client) => {
    const { rows } = await client.query<{ owed: string; customer_name: string | null; invoice_id: number | null }>(
      "SELECT amount - amount_paid AS owed, customer_name, invoice_id FROM incomes WHERE id = $1 AND deleted_at IS NULL FOR UPDATE",
      [incomeId],
    );
    const owed = Number(rows[0]?.owed ?? 0);
    if (owed <= 0) return { ok: false as const, error: t("Deni hili limeshalipwa au mapato yamefutwa.", "This debt is paid already, or the income was deleted.") };
    const amount = parseDebtPayment(String(formData.get("amount") ?? ""), owed, t);
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
    const who = rows[0].customer_name ?? t("Mteja", "The client");
    const settled = invoice.rows[0] ? t(` Invoice ${invoice.rows[0].number} imelipwa yote.`, ` Invoice ${invoice.rows[0].number} is paid in full.`) : "";
    return {
      ok: true as const,
      message:
        left === 0
          ? t(`${who} amemaliza deni lake.${settled}`, `${who} has cleared their debt.${settled}`)
          : t(
              `Malipo ya ${formatMoney(amount.amount)} yamehifadhiwa. ${who} bado anadaiwa ${formatMoney(left)}.`,
              `Payment of ${formatMoney(amount.amount)} saved. ${who} still owes ${formatMoney(left)}.`,
            ),
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
  const t = await getT();
  const incomeId = Number(formData.get("incomeId"));
  if (!Number.isInteger(incomeId)) return { ok: false, message: t("Mapato hayajulikani.", "Unknown income.") };

  const deleted = await query(
    `UPDATE incomes SET deleted_at = now(), deleted_by = $2
      WHERE id = $1 AND recorded_by = $2 AND deleted_at IS NULL AND invoice_id IS NULL
        AND coalesce(backfilled_at, created_at) > now() - make_interval(hours => $3)
      RETURNING id`,
    [incomeId, manager.id, DELETE_WINDOW_HOURS],
  );
  if (deleted.length === 0) {
    return {
      ok: false,
      message: t(
        `Hayawezi kufutwa tena: zimepita saa ${DELETE_WINDOW_HOURS} au yamefutwa tayari.`,
        `It can't be deleted any more: ${DELETE_WINDOW_HOURS} hours have passed or it is deleted already.`,
      ),
    };
  }
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  await notify([MANAGERS_CHANNEL]);
}

export type EditIncomeState =
  | { ok: true; message: string }
  | { ok: false; errors: IncomeErrors & CargoErrors & { date?: string; form?: string } }
  | undefined;

// Any manager may correct a mapato entry (car, amount or cargo, note, and the day for history typed in
// later). Trips from an invoice change only through the invoice. The row is locked while it is checked.
// Money still owed stays owed: the amount can't go below what the client already paid. An entry paid
// in full at once stays paid in full at its new amount.
export async function updateIncome(_prev: EditIncomeState, formData: FormData): Promise<EditIncomeState> {
  const manager = await requireUser("manager");
  const t = await getT();
  const incomeId = Number(formData.get("incomeId"));
  if (!Number.isInteger(incomeId)) return { ok: false, errors: { form: t("Mapato hayajulikani.", "Unknown income.") } };
  const kind = formData.get("kind") === "cargo" ? "cargo" : "other";
  const unit = cargoUnit(String(formData.get("unit") ?? ""));
  const cargo =
    kind === "cargo"
      ? parseCargo(String(formData.get("rate") ?? ""), String(formData.get("quantity") ?? ""), unit, String(formData.get("destination") ?? ""), t)
      : null;
  const parsed = parseIncome({
    carId: String(formData.get("carId") ?? ""),
    amount: cargo ? ("amount" in cargo ? String(cargo.amount) : "1") : String(formData.get("amount") ?? ""),
    description: String(formData.get("description") ?? ""),
  }, t);
  const date = parseEntryDate(String(formData.get("date") ?? ""), todayInTanzania(), t);
  if (!parsed.ok || (cargo && "errors" in cargo) || "error" in date) {
    return {
      ok: false,
      errors: {
        ...(parsed.ok ? {} : parsed.errors),
        ...(cargo && "errors" in cargo ? cargo.errors : {}),
        ...("error" in date ? { date: date.error } : {}),
      },
    };
  }
  const load = cargo && "amount" in cargo ? cargo : null;

  const result = await transaction(async (client): Promise<EditIncomeState> => {
    const { rows } = await client.query<{ amount_paid: string; customer_name: string | null; backfilled_at: Date | null }>(
      "SELECT amount_paid, customer_name, backfilled_at FROM incomes WHERE id = $1 AND deleted_at IS NULL AND invoice_id IS NULL FOR UPDATE",
      [incomeId],
    );
    const row = rows[0];
    if (!row) return { ok: false, errors: { form: t("Mapato haya hayawezi kubadilishwa: yamefutwa au ni ya invoice.", "This income can't be changed: it is deleted or belongs to an invoice.") } };
    if (row.customer_name !== null && Number(parsed.amount) < Number(row.amount_paid)) {
      return {
        ok: false,
        errors: {
          amount: t(
            `Mteja ameshalipa ${formatMoney(row.amount_paid)}. Kiasi hakiwezi kuwa chini ya hicho.`,
            `The client has paid ${formatMoney(row.amount_paid)}. The amount can't be below that.`,
          ),
        },
      };
    }
    // History keeps its day; recent income keeps the moment it was recorded.
    if (row.backfilled_at && date.date === null) return { ok: false, errors: { date: t("Rekodi ya zamani lazima iwe na tarehe ya zamani.", "A past record needs a past date.") } };
    const updated = await client.query(
      `UPDATE incomes i
          SET car_id = c.id, source = c.plate, amount = $2, description = $3,
              rate_per_tonne = $4, tonnes = $5, unit = $6, destination = $7,
              amount_paid = CASE WHEN i.customer_name IS NULL THEN $2::numeric ELSE i.amount_paid END,
              created_at = CASE WHEN i.backfilled_at IS NOT NULL AND $8::date IS NOT NULL
                                THEN ($8::date + time '12:00') AT TIME ZONE $9 ELSE i.created_at END,
              edited_at = now(), edited_by = $10
         FROM cars c
        WHERE i.id = $1 AND c.id = $11
        RETURNING i.id`,
      [
        incomeId, parsed.amount, parsed.description, load?.ratePerTonne ?? null, load?.tonnes ?? null, load?.unit ?? "tonne",
        load?.destination ?? null, date.date, TIME_ZONE, manager.id, parsed.carId,
      ],
    );
    if (updated.rows.length === 0) return { ok: false, errors: { carId: t("Gari hilo halipo tena. Chagua jingine.", "That car is gone. Pick another.") } };
    return { ok: true, message: t("Mapato yamebadilishwa.", "Income changed.") };
  });
  if (result?.ok) {
    revalidatePath("/manager", "layout");
    revalidatePath("/director", "layout");
    revalidatePath("/factory", "layout");
    revalidatePath("/accountant", "layout");
    await notify([MANAGERS_CHANNEL]);
  }
  return result;
}
