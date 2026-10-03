import Link from "next/link";
import { issueRequest } from "@/app/actions/requests";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestSummary } from "@/components/request-item";
import { formatMoney } from "@/lib/format";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { listAwaitingIssue, listAwaitingReceipt } from "@/lib/requests";
import { requireUser } from "@/lib/session";
import { MAX_ISSUE_NOTE_LENGTH } from "@/lib/validation";
import { AddReceipt } from "./add-receipt";

// Two steps share one card: approved requests to pay, oldest approval first, and paid ones whose
// receipt is still to come, oldest payment first. The tab lives in the URL so live refreshes keep it.
export default async function AccountantPage({ searchParams }: PageProps<"/accountant">) {
  await requireUser("accountant");
  const tab = (await searchParams).tab === "risiti" ? "risiti" : "kulipa";
  const [waiting, receipts] = await Promise.all([listAwaitingIssue(), listAwaitingReceipt()]);
  const total = waiting.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title="Kulipa"
        description={
          (waiting.length > 0
            ? `${waiting.length === 1 ? "Ombi 1 linasubiri" : `Maombi ${waiting.length} yanasubiri`} ulipe, jumla ${formatMoney(total)}.`
            : "Hakuna ombi linalosubiri kulipwa.") +
          (receipts.length > 0
            ? ` ${receipts.length === 1 ? "Malipo 1 yanasubiri" : `Malipo ${receipts.length} yanasubiri`} risiti.`
            : "")
        }
      />

      <section className="card grid gap-3">
        <nav className="-mx-4 -mt-4 flex border-b border-line sm:-mx-5 sm:-mt-5" aria-label="Kulipa au risiti">
          {(
            [
              { key: "kulipa", label: "Kulipa", count: waiting.length, href: "/accountant" },
              { key: "risiti", label: "Risiti", count: receipts.length, href: "/accountant?tab=risiti" },
            ] as const
          ).map((t) => (
            <Link
              key={t.key}
              href={t.href}
              scroll={false}
              aria-current={tab === t.key ? "page" : undefined}
              className="flex flex-1 items-center justify-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:text-foreground"
            >
              {t.label}
              <span className="rounded-full bg-background px-2 text-xs tabular-nums">{t.count}</span>
            </Link>
          ))}
        </nav>

        {tab === "kulipa" ? (
          <>
            <p className="text-sm text-muted">
              Andika kumbukumbu kama namba ya M-Pesa ukipenda. Ukishalipa, ombi linahamia Risiti hadi uweke risiti yake.
            </p>
            {waiting.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Umelipa yote. 👍</p>
            ) : (
              <ul className="divide-y divide-line">
                {waiting.map((r) => (
                  <li key={r.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_minmax(0,20rem)] sm:items-center">
                    <RequestSummary request={r} />
                    <form action={issueRequest} className="grid gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input
                        name="note"
                        maxLength={MAX_ISSUE_NOTE_LENGTH}
                        autoComplete="off"
                        placeholder="Kumbukumbu (si lazima)"
                        aria-label={`Kumbukumbu ya malipo ya ${r.requester_name}, mfano namba ya M-Pesa`}
                        className="input"
                      />
                      <button type="submit" className="btn btn-primary">
                        Lipa {formatMoney(r.amount)}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              Malipo yaliyotolewa ambayo risiti yake bado. Ununuzi ukikamilika, weka picha ya risiti.
            </p>
            {receipts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Risiti zote zimewekwa. 👍</p>
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
            Historia ya malipo →
          </Link>
        </p>
      </section>
    </main>
  );
}
