import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { COMPANY, COMPANY_DETAILS } from "@/lib/company";
import { formatDateTime, formatMoney, formatTonnes, formatWallDate } from "@/lib/format";
import { getInvoice } from "@/lib/invoices";
import { requireUser } from "@/lib/session";
import { InvoiceStatusBadge } from "../invoice-status";
import { InvoiceActions } from "./invoice-actions";

// One invoice laid out as the customer will see it, with its download and status actions.
export default async function InvoicePage({ params, searchParams }: PageProps<"/manager/invoices/[id]">) {
  await requireUser("manager");
  const id = Number((await params).id);
  const invoice = Number.isInteger(id) ? await getInvoice(id) : null;
  if (!invoice) notFound();
  const saved = (await searchParams).new === "1";

  return (
    <main className="page">
      <PageHeader
        title={invoice.number}
        description={
          <>
            Imetengenezwa na {invoice.created_by ?? "meneja"} {formatDateTime(invoice.created_at)}
            {invoice.paid_at && ` · Imelipwa ${formatDateTime(invoice.paid_at)}${invoice.paid_by ? ` (${invoice.paid_by})` : ""}`}
            {invoice.cancelled_at && ` · Imefutwa ${formatDateTime(invoice.cancelled_at)}${invoice.cancelled_by ? ` (${invoice.cancelled_by})` : ""}`}
          </>
        }
        action={
          <Link href="/manager/invoices" className="btn btn-ghost">
            Ankara zote
          </Link>
        }
      />
      <InvoiceActions id={invoice.id} number={invoice.number} open={invoice.status === "open"} saved={saved} />

      <article className="card grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-accent">{COMPANY}</p>
            {COMPANY_DETAILS.map((line) => (
              <p key={line} className="text-sm text-muted">
                {line}
              </p>
            ))}
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold tracking-wide">ANKARA</p>
            <p className="text-sm text-muted">Tarehe {formatWallDate(invoice.issued_on)}</p>
            {invoice.due_on && <p className="text-sm text-muted">Mwisho wa kulipa {formatWallDate(invoice.due_on)}</p>}
            <div className="mt-1">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line p-3">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Kwa</p>
          <p className="font-semibold break-words">{invoice.customer_name}</p>
          {invoice.customer_contact && <p className="text-sm break-words whitespace-pre-line text-muted">{invoice.customer_contact}</p>}
        </div>

        <ul className="divide-y divide-line">
          {invoice.lines.map((l) => (
            <li key={l.position} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-medium break-words">
                  {l.position}. {l.description}
                  {l.plate && <span className="plate ml-2">{l.plate}</span>}
                </p>
                <p className="text-sm text-muted tabular-nums">
                  Tani {formatTonnes(l.tonnes)} × {formatMoney(l.rate_per_tonne)}
                </p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums">{formatMoney(l.amount)}</p>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between gap-3 border-t border-foreground pt-3">
          <span className="font-semibold">Jumla</span>
          <span className={`text-xl font-semibold tabular-nums ${invoice.status === "cancelled" ? "text-muted line-through" : ""}`}>
            {formatMoney(invoice.total)}
          </span>
        </div>

        {invoice.payment_details && (
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Maelezo ya malipo</p>
            <p className="text-sm break-words whitespace-pre-line">{invoice.payment_details}</p>
          </div>
        )}
      </article>
    </main>
  );
}
