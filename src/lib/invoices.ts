import "server-only";
import { query } from "@/lib/db";

export type InvoiceStatus = "open" | "paid" | "cancelled";

export type InvoiceSummary = {
  id: number;
  number: string;
  customer_name: string;
  issued_on: string; // "YYYY-MM-DD"
  due_on: string | null;
  total: string;
  status: InvoiceStatus;
};

export type InvoiceDetail = InvoiceSummary & {
  customer_contact: string | null;
  payment_details: string | null;
  created_by: string | null;
  created_at: Date;
  paid_at: Date | null;
  paid_by: string | null;
  cancelled_at: Date | null;
  cancelled_by: string | null;
  // Invoices made since 022 put their trips in Mapato as the client's debt; older ones are documents only.
  in_income: boolean;
  // What the client has paid on its trips so far, on Madeni or by marking it paid.
  amount_paid: string;
  // Each trip is kept in tonnes; `unit` says whether it was priced by the tonne or the kilo.
  lines: { position: number; description: string; plate: string | null; unit: string; tonnes: string; rate_per_tonne: string; amount: string }[];
};

const STATUS = `CASE WHEN i.cancelled_at IS NOT NULL THEN 'cancelled' WHEN i.paid_at IS NOT NULL THEN 'paid' ELSE 'open' END`;

export const INVOICE_PAGE_SIZE = 25;

// Newest first. Dates come back as plain days, as typed.
export async function listInvoices(page: number) {
  const rows = await query<InvoiceSummary & { total_count: number }>(
    `SELECT i.id, i.number, i.customer_name, to_char(i.issued_on, 'YYYY-MM-DD') AS issued_on,
            to_char(i.due_on, 'YYYY-MM-DD') AS due_on, i.total, ${STATUS} AS status,
            count(*) OVER ()::int AS total_count
       FROM invoices i
      ORDER BY i.year DESC, i.seq DESC
      LIMIT $1 OFFSET $2`,
    [INVOICE_PAGE_SIZE, (page - 1) * INVOICE_PAGE_SIZE],
  );
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export async function getInvoice(id: number): Promise<InvoiceDetail | null> {
  const [invoice] = await query<Omit<InvoiceDetail, "lines">>(
    `SELECT i.id, i.number, i.customer_name, i.customer_contact, to_char(i.issued_on, 'YYYY-MM-DD') AS issued_on,
            to_char(i.due_on, 'YYYY-MM-DD') AS due_on, i.payment_details, i.total, ${STATUS} AS status,
            c.name AS created_by, i.created_at, i.paid_at, p.name AS paid_by, i.cancelled_at, x.name AS cancelled_by,
            EXISTS (SELECT 1 FROM incomes WHERE invoice_id = i.id) AS in_income,
            (SELECT coalesce(sum(amount_paid), 0) FROM incomes WHERE invoice_id = i.id AND deleted_at IS NULL) AS amount_paid
       FROM invoices i
       LEFT JOIN users c ON c.id = i.created_by
       LEFT JOIN users p ON p.id = i.paid_by
       LEFT JOIN users x ON x.id = i.cancelled_by
      WHERE i.id = $1`,
    [id],
  );
  if (!invoice) return null;
  const lines = await query<InvoiceDetail["lines"][number]>(
    `SELECT position, description, plate, unit, tonnes, rate_per_tonne, amount
       FROM invoice_lines WHERE invoice_id = $1 ORDER BY position`,
    [id],
  );
  return { ...invoice, lines };
}

// The payment details of the last invoice, to start the next one with.
export async function lastPaymentDetails() {
  const [row] = await query<{ payment_details: string }>(
    "SELECT payment_details FROM invoices WHERE payment_details IS NOT NULL ORDER BY created_at DESC LIMIT 1",
  );
  return row?.payment_details ?? "";
}
