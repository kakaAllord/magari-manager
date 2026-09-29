import { reviewRequest } from "@/app/actions/requests";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { listRequestsByStatus, type MoneyRequest } from "@/lib/requests";
import { requireUser } from "@/lib/session";

export default async function RequestsPage() {
  await requireUser("manager");
  const [pending, reviewed] = await Promise.all([listRequestsByStatus(true), listRequestsByStatus(false)]);
  const pendingTotal = pending.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title="Maombi"
        description={
          pending.length > 0
            ? `Maombi ${pending.length} yanasubiri idhini yako, jumla ${formatMoney(pendingTotal)}.`
            : "Hakuna ombi linalosubiri kwa sasa."
        }
      />

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">
          Yanasubiri idhini <span className="text-muted">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Umemaliza yote. 👍</p>
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((r) => (
              <li key={r.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <RequestSummary request={r} />
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <form action={reviewRequest} className="grid">
                    <input type="hidden" name="id" value={r.id} />
                    <button name="decision" value="approved" className="btn btn-primary">
                      Kubali
                    </button>
                  </form>
                  <form action={reviewRequest} className="grid">
                    <input type="hidden" name="id" value={r.id} />
                    <button name="decision" value="rejected" className="btn btn-ghost text-danger">
                      Kataa
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">Yaliyoshughulikiwa karibuni</h2>
        {reviewed.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Bado hakuna ombi lililoshughulikiwa.</p>
        ) : (
          <ul className="divide-y divide-line">
            {reviewed.map((r) => (
              <li key={r.id} className="flex items-start gap-4 py-3.5">
                <RequestSummary request={r} />
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function RequestSummary({ request: r }: { request: MoneyRequest }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="font-semibold tabular-nums">
        {formatMoney(r.amount)} <span className="font-normal text-muted">· {r.driver_name}</span>
      </p>
      <p className="text-sm break-words">{r.reason}</p>
      <p className="mt-1 text-xs text-muted">
        {r.car ?? "Hakuna gari"} · Imetumwa {formatDateTime(r.created_at)}
        {r.reviewed_at && ` · Imeshughulikiwa na ${r.reviewer_name ?? "meneja"} ${formatDateTime(r.reviewed_at)}`}
      </p>
    </div>
  );
}
