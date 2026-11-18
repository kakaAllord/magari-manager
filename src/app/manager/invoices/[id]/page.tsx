import { getT } from "@/lib/lang";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { amountInEnglish } from "@/lib/amount-words-en";
import { COMPANY, companyDetails } from "@/lib/company";
import { cargoSum, formatDateTime, formatMoney, formatWallDate } from "@/lib/format";
import { bankRows, getInvoice } from "@/lib/invoices";
import { requireUser } from "@/lib/session";
import { InvoiceStatusBadge } from "../invoice-status";
import { InvoiceActions } from "./invoice-actions";

// One invoice laid out as the customer will see it, with its download and status actions.
export default async function InvoicePage({ params, searchParams }: PageProps<"/manager/invoices/[id]">) {
  await requireUser("manager");
  const t = await getT();
  const id = Number((await params).id);
  const invoice = Number.isInteger(id) ? await getInvoice(id) : null;
  if (!invoice) notFound();
  const saved = (await searchParams).new === "1";
  const paid = Number(invoice.amount_paid);
  const owed = Number(invoice.total) - paid;

  return (
    <main className="page">
      <PageHeader
        title={invoice.number}
        description={
          <>
            {t(`Imetengenezwa na ${invoice.created_by ?? "meneja"}`, `Made by ${invoice.created_by ?? "the manager"}`)}{" "}
            {formatDateTime(invoice.created_at)}
            {invoice.paid_at && ` · ${t("Imelipwa", "Paid")} ${formatDateTime(invoice.paid_at)}${invoice.paid_by ? ` (${invoice.paid_by})` : ""}`}
            {invoice.cancelled_at &&
              ` · ${t("Imefutwa", "Cancelled")} ${formatDateTime(invoice.cancelled_at)}${invoice.cancelled_by ? ` (${invoice.cancelled_by})` : ""}`}
            {invoice.cancel_reason && (
              <span className="mt-1 block break-words">
                {t("Sababu ya kufuta", "Reason for cancelling")}: {invoice.cancel_reason}
              </span>
            )}
          </>
        }
        action={
          <Link href="/manager/invoices" className="btn btn-ghost">
            {t("Invoice zote", "All invoices")}
          </Link>
        }
      />
      <InvoiceActions
        id={invoice.id}
        number={invoice.number}
        open={invoice.status === "open"}
        saved={saved}
        inIncome={invoice.in_income}
        owed={owed}
        partPaid={paid > 0}
      />
      {invoice.in_income && invoice.status !== "cancelled" && (
        <p className="text-sm">
          {owed > 0 ? (
            <>
              <span className="rounded bg-warn-soft px-1.5 py-px text-xs font-medium text-warn">{t("Deni", "Owed")} {formatMoney(owed)}</span>{" "}
              {t(`${invoice.customer_name} anadaiwa kwenye`, `${invoice.customer_name} owes it on`)}{" "}
              <Link href="/manager/income?tab=madeni" className="font-medium text-accent underline">
                {t("Madeni", "Debts")}
              </Link>
              {paid > 0 && <span className="text-muted"> · {t("amelipa", "paid")} {formatMoney(paid)}</span>}
            </>
          ) : (
            <>
              <span className="rounded bg-ok-soft px-1.5 py-px text-xs font-medium text-ok">{t("Deni limelipwa", "Debt paid")}</span>{" "}
              <span className="text-muted">{t("Imehesabiwa kama pesa iliyoingia kwenye Mapato.", "Counted as money received in Income.")}</span>
            </>
          )}
        </p>
      )}

      <article className="card grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-accent">{COMPANY}</p>
            {companyDetails(t).map((line) => (
              <p key={line} className="text-sm text-muted">
                {line}
              </p>
            ))}
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold tracking-wide">INVOICE</p>
            <p className="text-sm text-muted">{t("Tarehe", "Date")} {formatWallDate(invoice.issued_on)}</p>
            {invoice.due_on && <p className="text-sm text-muted">{t("Mwisho wa kulipa", "Due")} {formatWallDate(invoice.due_on)}</p>}
            <div className="mt-1">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line p-3">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{t("Kwa", "To")}</p>
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
                <p className="text-sm text-muted tabular-nums">{cargoSum(l, t)}</p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums">{formatMoney(l.amount)}</p>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between gap-3 border-t border-foreground pt-3">
          <span className="font-semibold">{t("Jumla", "Total")}</span>
          <span className={`text-xl font-semibold tabular-nums ${invoice.status === "cancelled" ? "text-muted line-through" : ""}`}>
            {formatMoney(invoice.total)}
          </span>
        </div>
        <p className="-mt-3 text-sm break-words">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">{t("Kiasi kwa maneno", "Amount in words")}: </span>
          {amountInEnglish(invoice.total)}
        </p>

        {invoice.bank_name && (
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{t("Taarifa za benki", "Bank details")}</p>
            <dl className="mt-1 grid gap-x-4 gap-y-0.5 text-sm sm:grid-cols-[auto_1fr]">
              {bankRows(invoice, t).map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-muted">{key}</dt>
                  <dd className="font-medium break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {invoice.payment_details && (
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{t("Maelezo ya malipo", "Payment details")}</p>
            <p className="text-sm break-words whitespace-pre-line">{invoice.payment_details}</p>
          </div>
        )}
      </article>
    </main>
  );
}
