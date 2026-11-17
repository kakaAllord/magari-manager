import { getT } from "@/lib/lang";
import Link from "next/link";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestSummary } from "@/components/request-item";
import { formatMoney } from "@/lib/format";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { getVoucherRequest, listAwaitingIssue, listAwaitingReceipt } from "@/lib/requests";
import { requireUser } from "@/lib/session";
import { AddReceipt } from "./add-receipt";
import { PaidToast } from "./paid-toast";
import { PayRequest } from "./pay-request";

// Two steps share one card: authorised requests to pay, oldest authorisation first, and paid ones whose
// receipt is still to come, oldest payment first. The tab lives in the URL so live refreshes keep it.
export default async function AccountantPage({ searchParams }: PageProps<"/accountant">) {
  await requireUser("accountant");
  const t = await getT();
  const sp = await searchParams;
  const tab = sp.tab === "risiti" ? "risiti" : "kulipa";
  const paidId = Number(sp.paid);
  const [waiting, receipts, paid] = await Promise.all([
    listAwaitingIssue(),
    listAwaitingReceipt(),
    Number.isInteger(paidId) && paidId > 0 ? getVoucherRequest(paidId, null) : null,
  ]);
  const total = waiting.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      {paid?.voucher_number && <PaidToast key={paid.id} id={paid.id} number={paid.voucher_number} />}
      <PageHeader
        title={t("Kulipa", "To pay")}
        description={
          (waiting.length > 0
            ? t(
                `${waiting.length === 1 ? "Ombi 1 linasubiri" : `Maombi ${waiting.length} yanasubiri`} ulipe, jumla ${formatMoney(total)}.`,
                `${waiting.length === 1 ? "1 request is" : `${waiting.length} requests are`} waiting for you to pay, ${formatMoney(total)} in all.`,
              )
            : t("Hakuna ombi linalosubiri kulipwa.", "No request is waiting to be paid.")) +
          (receipts.length > 0
            ? t(
                ` ${receipts.length === 1 ? "Malipo 1 yanasubiri" : `Malipo ${receipts.length} yanasubiri`} risiti.`,
                ` ${receipts.length === 1 ? "1 payment is" : `${receipts.length} payments are`} waiting for a receipt.`,
              )
            : "")
        }
      />

      <section className="card grid gap-3">
        <nav className="-mx-4 -mt-4 flex border-b border-line sm:-mx-5 sm:-mt-5" aria-label={t("Kulipa au risiti", "To pay or receipts")}>
          {(
            [
              { key: "kulipa", label: t("Kulipa", "To pay"), count: waiting.length, href: "/accountant" },
              { key: "risiti", label: t("Risiti", "Receipts"), count: receipts.length, href: "/accountant?tab=risiti" },
            ] as const
          ).map((x) => (
            <Link
              key={x.key}
              href={x.href}
              scroll={false}
              aria-current={tab === x.key ? "page" : undefined}
              className="flex flex-1 items-center justify-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:text-foreground"
            >
              {x.label}
              <span className="rounded-full bg-background px-2 text-xs tabular-nums">{x.count}</span>
            </Link>
          ))}
        </nav>

        {tab === "kulipa" ? (
          <>
            <p className="text-sm text-muted">
              {t(
                "Bonyeza Lipa, chagua njia ya malipo na viambatisho. Payment voucher inatengenezwa yenyewe, na ombi linahamia Risiti hadi uweke risiti yake.",
                "Press Pay, choose how it was paid and what is attached. The payment voucher is made by itself, and the request moves to Receipts until you add its receipt.",
              )}
            </p>
            {waiting.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">{t("Umelipa yote.", "All paid.")} 👍</p>
            ) : (
              <ul className="divide-y divide-line">
                {waiting.map((r) => (
                  <li key={r.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <RequestSummary request={r} />
                    <PayRequest id={r.id} amount={r.amount} fuel={r.kind === "fuel"} summary={`${r.requester_name} · ${r.reason}`} />
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              {t(
                "Malipo yaliyotolewa ambayo risiti yake bado. Ununuzi ukikamilika, weka picha ya risiti.",
                "Payments made whose receipt hasn't come yet. Once the purchase is done, add a photo of the receipt.",
              )}
            </p>
            {receipts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">{t("Risiti zote zimewekwa.", "All receipts are in.")} 👍</p>
            ) : (
              <ul className="divide-y divide-line">
                {receipts.map((r) => (
                  <li key={r.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <RequestSummary request={r} />
                    <AddReceipt
                      requestId={r.id}
                      summary={`${formatMoney(r.amount)} · ${r.requester_name} · ${r.reason}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <p className="text-sm">
          <Link href="/accountant/history" className="font-medium text-accent underline">
            {t("Historia ya malipo", "Payment history")} →
          </Link>
        </p>
      </section>
    </main>
  );
}
