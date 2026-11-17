import { sw, type Tr } from "@/lib/i18n";
import "server-only";
import { query } from "@/lib/db";
import type { InvoiceBankInput } from "@/lib/validation";

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
  // Free-text payment details: invoices made before 025 have these instead of the bank block.
  payment_details: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  bank_swift: string | null;
  payment_purpose: string | null;
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

// Newest first. Dates come back as plain days, as typed. `search` matches the number, the customer's
// name or contact, and the plate or description of any trip on it, ignoring case.
export async function listInvoices(page: number, search = "") {
  const term = search.trim().slice(0, 80).replace(/[\\%_]/g, "\\$&");
  const rows = await query<InvoiceSummary & { total_count: number }>(
    `SELECT i.id, i.number, i.customer_name, to_char(i.issued_on, 'YYYY-MM-DD') AS issued_on,
            to_char(i.due_on, 'YYYY-MM-DD') AS due_on, i.total, ${STATUS} AS status,
            count(*) OVER ()::int AS total_count
       FROM invoices i
      WHERE $3 = '' OR i.number ILIKE '%' || $3 || '%' OR i.customer_name ILIKE '%' || $3 || '%'
         OR i.customer_contact ILIKE '%' || $3 || '%'
         OR EXISTS (SELECT 1 FROM invoice_lines l WHERE l.invoice_id = i.id
                     AND (l.plate ILIKE '%' || $3 || '%' OR l.description ILIKE '%' || $3 || '%'))
      ORDER BY i.year DESC, i.seq DESC
      LIMIT $1 OFFSET $2`,
    [INVOICE_PAGE_SIZE, (page - 1) * INVOICE_PAGE_SIZE, term],
  );
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export async function getInvoice(id: number): Promise<InvoiceDetail | null> {
  const [invoice] = await query<Omit<InvoiceDetail, "lines">>(
    `SELECT i.id, i.number, i.customer_name, i.customer_contact, to_char(i.issued_on, 'YYYY-MM-DD') AS issued_on,
            to_char(i.due_on, 'YYYY-MM-DD') AS due_on, i.payment_details, i.total, ${STATUS} AS status,
            i.bank_name, i.bank_account_number, i.bank_account_name, i.bank_swift, i.payment_purpose,
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

// The bank block as label and value, in the order the invoice prints it; empty for invoices made before 025.
export function bankRows(inv: InvoiceDetail, t: Tr = sw): [string, string][] {
  if (!inv.bank_name) return [];
  const rows: [string, string | null][] = [
    [t("Benki", "Bank"), inv.bank_name],
    [t("Namba ya akaunti", "Account number"), inv.bank_account_number],
    [t("Jina la akaunti", "Account name"), inv.bank_account_name],
    ["SWIFT code", inv.bank_swift],
    [t("Malipo ni ya", "Payment for"), inv.payment_purpose],
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}

// The bank block of the last invoice that had one, to start the next one with; blank before the first.
export async function lastBankDetails(): Promise<InvoiceBankInput> {
  const [row] = await query<InvoiceBankInput>(
    `SELECT bank_name AS name, bank_account_number AS "accountNumber", bank_account_name AS "accountName",
            coalesce(bank_swift, '') AS swift, coalesce(payment_purpose, '') AS purpose
       FROM invoices WHERE bank_name IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
  );
  return row ?? { name: "", accountNumber: "", accountName: "", swift: "", purpose: "" };
}
