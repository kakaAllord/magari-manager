"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { transaction } from "@/lib/db";
import { MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { todayInTanzania, WITHOUT_CAR } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { TIME_ZONE } from "@/lib/time";
import { cargoUnit, parseInvoice, type InvoiceErrors, type InvoiceInput } from "@/lib/validation";

export type InvoiceFormState = { ok: false; errors: InvoiceErrors; values: InvoiceInput } | undefined;

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

// Saves a new invoice and opens it. Its number is the next one for the year of its date: a lock
// held until the end of the transaction keeps two managers from taking the same number.
// Each trip also goes into Mapato as cargo income on the invoice's date, nothing paid yet, so the
// client owes it on Madeni until the invoice is paid. A past date is history, as on Mapato.
export async function createInvoice(_prev: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const manager = await requireUser("manager");
  const column = (name: string) => formData.getAll(name).map(String);
  const descriptions = column("description");
  const plates = column("plate");
  // A page opened before kilos were offered sends tonnes under their old name and no units.
  const quantities = formData.has("quantity") ? column("quantity") : column("tonnes");
  const units = column("unit");
  const rates = column("rate");
  const values: InvoiceInput = {
    customer: text(formData, "customer"),
    contact: text(formData, "contact"),
    issuedOn: text(formData, "issuedOn"),
    dueOn: text(formData, "dueOn"),
    payment: text(formData, "payment"),
    lines: descriptions.map((description, i) => ({
      description,
      plate: plates[i] ?? "",
      quantity: quantities[i] ?? "",
      unit: cargoUnit(units[i] ?? ""),
      rate: rates[i] ?? "",
    })),
  };
  const parsed = parseInvoice(values, todayInTanzania());
  if (!parsed.ok) return { ok: false, errors: parsed.errors, values };
  const inv = parsed.invoice;

  const id = await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('invoices'))");
    const year = Number(inv.issuedOn.slice(0, 4));
    const next = await client.query<{ seq: number }>("SELECT coalesce(max(seq), 0) + 1 AS seq FROM invoices WHERE year = $1", [year]);
    const seq = next.rows[0].seq;
    const number = `ANK-${year}-${String(seq).padStart(3, "0")}`;
    const inserted = await client.query<{ id: number }>(
      `INSERT INTO invoices (year, seq, number, customer_name, customer_contact, issued_on, due_on, payment_details, total, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [year, seq, number, inv.customer, inv.contact, inv.issuedOn, inv.dueOn, inv.payment, inv.total, manager.id],
    );
    const invoiceId = inserted.rows[0].id;
    for (const [i, l] of inv.lines.entries()) {
      await client.query(
        `INSERT INTO invoice_lines (invoice_id, position, description, plate, unit, tonnes, rate_per_tonne, amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [invoiceId, i + 1, l.description, l.plate, l.unit, l.tonnes, l.ratePerTonne, l.amount],
      );
      await client.query(
        `INSERT INTO incomes (car_id, source, amount, description, recorded_by, created_at, backfilled_at,
                              rate_per_tonne, tonnes, unit, destination, amount_paid, customer_name, invoice_id)
         SELECT c.id, coalesce(c.plate, $1, $2), $3, $4, $5,
                CASE WHEN $6 THEN now() ELSE ($7::date + time '12:00') AT TIME ZONE $8 END,
                CASE WHEN $6 THEN NULL ELSE now() END,
                $9, $10, $14, $11, 0, $12, $13
           FROM (SELECT 1) one LEFT JOIN cars c ON c.plate = $1`,
        [
          l.plate, WITHOUT_CAR, l.amount, `Ankara ${number}`, manager.id, inv.issuedOn === todayInTanzania(), inv.issuedOn,
          TIME_ZONE, l.ratePerTonne, l.tonnes, l.description, inv.customer, invoiceId, l.unit,
        ],
      );
    }
    return invoiceId;
  });
  revalidateMoney();
  await notify([MANAGERS_CHANNEL]);
  redirect(`/manager/invoices/${id}?new=1`);
}

// Invoices and the income they put in Mapato show on every dashboard.
function revalidateMoney() {
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  revalidatePath("/factory", "layout");
}

// Only an invoice still open can be marked paid or cancelled, so a double tap is a no-op. Its
// entries in Mapato are locked before the invoice, the order a payment on Madeni takes too.
// Marking it paid pays off what is still owed on them, so it moves from deni to money in.
export async function markInvoicePaid(formData: FormData) {
  const manager = await requireUser("manager");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const paid = await transaction(async (client) => {
    const owed = await client.query<{ id: number; left: string }>(
      `SELECT id, amount - amount_paid AS left FROM incomes
        WHERE invoice_id = $1 AND deleted_at IS NULL ORDER BY id FOR UPDATE`,
      [id],
    );
    const invoice = await client.query<{ number: string }>(
      `UPDATE invoices SET paid_at = now(), paid_by = $2
        WHERE id = $1 AND paid_at IS NULL AND cancelled_at IS NULL RETURNING number`,
      [id, manager.id],
    );
    if (invoice.rows.length === 0) return false;
    for (const income of owed.rows.filter((r) => Number(r.left) > 0)) {
      await client.query("INSERT INTO income_payments (income_id, amount, note, recorded_by) VALUES ($1, $2, $3, $4)", [
        income.id,
        income.left,
        `Ankara ${invoice.rows[0].number}`,
        manager.id,
      ]);
      await client.query("UPDATE incomes SET amount_paid = amount WHERE id = $1", [income.id]);
    }
    return true;
  });
  if (!paid) return;
  revalidateMoney();
  await notify([MANAGERS_CHANNEL]);
}

export type CancelInvoiceResult = { ok: true } | { ok: false; error: string };

// A cancelled invoice keeps its number, marked "Imefutwa", so the numbering has no gaps to explain.
// Its entries leave Mapato with it. Once the client has paid any of it on Madeni, it stays.
export async function cancelInvoice(formData: FormData): Promise<CancelInvoiceResult> {
  const manager = await requireUser("manager");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { ok: false, error: "Ankara haijulikani." };
  const result = await transaction(async (client) => {
    const incomes = await client.query<{ amount_paid: string }>(
      "SELECT amount_paid FROM incomes WHERE invoice_id = $1 AND deleted_at IS NULL ORDER BY id FOR UPDATE",
      [id],
    );
    if (incomes.rows.some((r) => Number(r.amount_paid) > 0)) {
      return { ok: false as const, error: "Mteja ameshalipa sehemu ya ankara hii kwenye Madeni, kwa hiyo haiwezi kufutwa." };
    }
    const cancelled = await client.query(
      "UPDATE invoices SET cancelled_at = now(), cancelled_by = $2 WHERE id = $1 AND paid_at IS NULL AND cancelled_at IS NULL",
      [id, manager.id],
    );
    if (cancelled.rowCount === 0) return { ok: false as const, error: "Ankara hii imeshalipwa au kufutwa." };
    await client.query(
      "UPDATE incomes SET deleted_at = now(), deleted_by = $2 WHERE invoice_id = $1 AND deleted_at IS NULL",
      [id, manager.id],
    );
    return { ok: true as const };
  });
  if (result.ok) {
    revalidateMoney();
    await notify([MANAGERS_CHANNEL]);
  }
  return result;
}
