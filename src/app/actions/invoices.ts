"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, transaction } from "@/lib/db";
import { todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { parseInvoice, type InvoiceErrors, type InvoiceInput } from "@/lib/validation";

export type InvoiceFormState = { ok: false; errors: InvoiceErrors; values: InvoiceInput } | undefined;

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

// Saves a new invoice and opens it. Its number is the next one for the year of its date: a lock
// held until the end of the transaction keeps two managers from taking the same number.
export async function createInvoice(_prev: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const manager = await requireUser("manager");
  const column = (name: string) => formData.getAll(name).map(String);
  const descriptions = column("description");
  const plates = column("plate");
  const tonnes = column("tonnes");
  const rates = column("rate");
  const values: InvoiceInput = {
    customer: text(formData, "customer"),
    contact: text(formData, "contact"),
    issuedOn: text(formData, "issuedOn"),
    dueOn: text(formData, "dueOn"),
    payment: text(formData, "payment"),
    lines: descriptions.map((description, i) => ({ description, plate: plates[i] ?? "", tonnes: tonnes[i] ?? "", rate: rates[i] ?? "" })),
  };
  const parsed = parseInvoice(values, todayInTanzania());
  if (!parsed.ok) return { ok: false, errors: parsed.errors, values };
  const inv = parsed.invoice;

  const id = await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('invoices'))");
    const year = Number(inv.issuedOn.slice(0, 4));
    const next = await client.query<{ seq: number }>("SELECT coalesce(max(seq), 0) + 1 AS seq FROM invoices WHERE year = $1", [year]);
    const seq = next.rows[0].seq;
    const inserted = await client.query<{ id: number }>(
      `INSERT INTO invoices (year, seq, number, customer_name, customer_contact, issued_on, due_on, payment_details, total, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [year, seq, `ANK-${year}-${String(seq).padStart(3, "0")}`, inv.customer, inv.contact, inv.issuedOn, inv.dueOn, inv.payment, inv.total, manager.id],
    );
    const invoiceId = inserted.rows[0].id;
    for (const [i, l] of inv.lines.entries()) {
      await client.query(
        `INSERT INTO invoice_lines (invoice_id, position, description, plate, tonnes, rate_per_tonne, amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [invoiceId, i + 1, l.description, l.plate, l.tonnes, l.rate, l.amount],
      );
    }
    return invoiceId;
  });
  revalidatePath("/manager/invoices");
  redirect(`/manager/invoices/${id}?new=1`);
}

// Only an invoice still open can be marked paid or cancelled, so a double tap is a no-op.
export async function markInvoicePaid(formData: FormData) {
  const manager = await requireUser("manager");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await query(
    "UPDATE invoices SET paid_at = now(), paid_by = $2 WHERE id = $1 AND paid_at IS NULL AND cancelled_at IS NULL",
    [id, manager.id],
  );
  revalidatePath("/manager/invoices", "layout");
}

// A cancelled invoice keeps its number, marked "Imefutwa", so the numbering has no gaps to explain.
export async function cancelInvoice(formData: FormData) {
  const manager = await requireUser("manager");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await query(
    "UPDATE invoices SET cancelled_at = now(), cancelled_by = $2 WHERE id = $1 AND paid_at IS NULL AND cancelled_at IS NULL",
    [id, manager.id],
  );
  revalidatePath("/manager/invoices", "layout");
}
