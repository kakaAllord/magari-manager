import Link from "next/link";
import { issueRequest } from "@/app/actions/requests";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestSummary } from "@/components/request-item";
import { formatMoney } from "@/lib/format";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { listAwaitingIssue } from "@/lib/requests";
import { requireUser } from "@/lib/session";
import { MAX_ISSUE_NOTE_LENGTH } from "@/lib/validation";

// Approved requests waiting to be paid, oldest approval first.
export default async function AccountantPage() {
  await requireUser("accountant");
  const waiting = await listAwaitingIssue();
  const total = waiting.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title="Kulipa"
        description={
          waiting.length > 0
            ? `${waiting.length === 1 ? "Ombi 1 limekubaliwa na linasubiri" : `Maombi ${waiting.length} yamekubaliwa na yanasubiri`} ulipe, jumla ${formatMoney(total)}. Andika kumbukumbu kama namba ya M-Pesa ukipenda.`
            : "Hakuna ombi linalosubiri kulipwa."
        }
      />

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">
          Yanasubiri kulipwa <span className="text-muted">({waiting.length})</span>
        </h2>
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
        <p className="mt-3 text-sm">
          <Link href="/accountant/history" className="font-medium text-accent underline">
            Historia ya malipo →
          </Link>
        </p>
      </section>
    </main>
  );
}
