import { getT } from "@/lib/lang";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Pager, pageFrom } from "@/components/pager";
import { formatMoney, formatWallDate } from "@/lib/format";
import { INVOICE_PAGE_SIZE, listInvoices } from "@/lib/invoices";
import { requireUser } from "@/lib/session";
import { InvoiceStatusBadge } from "./invoice-status";

// Invoices for customers. Each one's trips go into Mapato as the client's debt until it is paid.
export default async function InvoicesPage({ searchParams }: PageProps<"/manager/invoices">) {
  await requireUser("manager");
  const t = await getT();
  const sp = await searchParams;
  const page = pageFrom(sp);
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const { rows, total } = await listInvoices(page, q);

  return (
    <main className="page">
      <PageHeader
        title="Invoice"
        description={t(
          "Invoice za wateja kwa safari za mizigo. Safari zake zinaingia Mapato kama deni la mteja hadi alipe.",
          "Client invoices for cargo trips. Their trips go into Income as the client's debt until paid.",
        )}
        action={
          <Link href="/manager/invoices/new" className="btn btn-primary gap-2">
            <Icon name="plus" className="size-4" />
            {t("Tengeneza invoice", "New invoice")}
          </Link>
        }
      />
      <section className="card">
        <form role="search" className="mb-3 flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={80}
            autoComplete="off"
            placeholder={t("Tafuta namba, mteja au gari", "Search number, client or car")}
            aria-label={t("Tafuta invoice", "Search invoices")}
            className="input min-w-0 flex-1"
          />
          <button type="submit" className="btn btn-primary">
            {t("Tafuta", "Search")}
          </button>
          {q && (
            <Link href="/manager/invoices" className="btn btn-ghost">
              {t("Futa", "Clear")}
            </Link>
          )}
        </form>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            {q
              ? t(`Hakuna invoice inayolingana na “${q}”.`, `No invoice matches “${q}”.`)
              : t("Bado hakuna invoice. Tengeneza ya kwanza.", "No invoices yet. Make the first one.")}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((i) => (
              <li key={i.id}>
                <Link href={`/manager/invoices/${i.id}`} className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-3.5 hover:bg-background">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">{i.customer_name}</p>
                    <p className="text-xs text-muted">
                      {i.number} · {formatWallDate(i.issued_on)}
                      {i.due_on && i.status === "open" && ` · ${t("mwisho", "due")} ${formatWallDate(i.due_on)}`}
                    </p>
                    {i.cancel_reason && <p className="text-xs break-words text-muted italic">{i.cancel_reason}</p>}
                  </div>
                  <div className="grid shrink-0 justify-items-end gap-1">
                    <p className={`font-semibold tabular-nums ${i.status === "cancelled" ? "text-muted line-through" : ""}`}>
                      {formatMoney(i.total)}
                    </p>
                    <InvoiceStatusBadge status={i.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Pager page={page} total={total} pageSize={INVOICE_PAGE_SIZE} params={q ? { q } : {}} />
      </section>
    </main>
  );
}
